// FILE: src/application/telegram/commands/article-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/tokens.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { createDraft } from '../../services/editorial-session.js';
import { QueueManager } from '../../../infrastructure/queue/queue-manager.js';

export async function articleCommand(
  update,
  telegramApi,
  sessionManager,
  container,
  _origin = null
) {
  let state = await sessionManager.getState(update.chatId);

  if (state === WORKFLOW_STATE.IDLE) {
    await sessionManager.create(update.chatId, update.userId, createDraft);
    state = WORKFLOW_STATE.WAITING_ARTICLE;
  }

  if (state !== WORKFLOW_STATE.WAITING_ARTICLE) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.WORKFLOW.ACTIVE_PROCESS);
  }

  if (!update.hasText) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.INTERACTION.INPUT_TEXT_REQUIRED);
  }

  const incomingText = (update.text || '').trim();
  const currentTimestamp = Date.now();
  const draftRepository = container.resolve(TOKENS.DRAFT_REPOSITORY);

  // 1. Simpan potongan teks langsung ke laci penyimpanan unik KV (Anti Race-Condition)
  await draftRepository.saveBufferPart(update.chatId, update.messageId, 'auto', incomingText);

  // 2. Baca draf aktif saat ini dan update timestamp eksekusi debouncer
  const draft = await sessionManager.get(update.chatId);
  const nextPartCount = (draft.bufferPartCount || 0) + 1;

  const draftWithMeta = draft.copyWith({
    bufferTimestamp: currentTimestamp,
    bufferPartCount: nextPartCount,
  });
  await sessionManager.save(draftWithMeta);

  if (nextPartCount === 1) {
    await telegramApi.sendMessage(
      update.chatId,
      '📥 *Menerima naskah...* Menggabungkan potongan dokumen berikutnya jika ada (mohon tunggu 2 detik).'
    );
  }

  const delayMs = 2500; // Timer tunggu aman untuk replikasi KV Cloudflare
  const draftId = draft.id;
  const chatId = update.chatId;
  const ctx = container.has('ctx') ? container.resolve('ctx') : null;

  // 3. Jalankan logika pengumpulan data asinkron
  const processBufferTask = async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const latestDraft = await sessionManager.get(chatId);
    if (!latestDraft || latestDraft.id !== draftId) return;

    // Hanya eksekusi jika ini adalah potongan chat terakhir yang masuk (Debounce Leader)
    if (latestDraft.bufferTimestamp !== currentTimestamp) {
      return;
    }

    // Unduh dan satukan seluruh potongan teks yang terkumpul di KV secara urut
    const combinedText = await draftRepository.getAndClearCombinedBuffer(chatId, 'auto');

    if (!combinedText) {
      logger.error('Failed to resolve combined text from split buffers.');
      return;
    }

    // Kunci status draf dan pasangkan naskah utuh yang sudah digabungkan
    const lockedDraft = latestDraft.copyWith({
      state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
      bufferPartCount: 0, // Reset
      source: {
        ...latestDraft.source,
        type: 'text',
        text: combinedText,
      },
    });
    await sessionManager.save(lockedDraft);

    // Kirim tugas penyuntingan ke antrean QueueManager
    await QueueManager.add(chatId, update.userId, 'STAGE_1_INGEST', {}, container);
  };

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(processBufferTask());
  } else {
    processBufferTask();
  }
}