// FILE: src/application/telegram/commands/article-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
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

  // =========================================================================
  // 📝 ALUR DEBOUNCE ANTRIAN NASKAH TEKS BIASA
  // =========================================================================
  const draft = await sessionManager.get(update.chatId);
  const existingText = draft.source?.text || '';
  const combinedText = existingText ? `${existingText}\n${incomingText}` : incomingText;
  const nextPartCount = (draft.bufferPartCount || 0) + 1;
  const currentTimestamp = Date.now();

  const draftWithSource = draft.copyWith({
    source: {
      ...draft.source,
      type: 'text',
      text: combinedText,
    },
    bufferTimestamp: currentTimestamp,
    bufferPartCount: nextPartCount,
  });

  await sessionManager.save(draftWithSource);

  if (nextPartCount === 1) {
    await telegramApi.sendMessage(
      update.chatId,
      '📥 *Menerima naskah...* Menggabungkan potongan dokumen berikutnya jika ada (mohon tunggu 2 detik).'
    );
  }

  const delayMs = 2000;
  const draftId = draft.id;
  const chatId = update.chatId;
  const ctx = container.has('ctx') ? container.resolve('ctx') : null;

  const processBufferTask = async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const latestDraft = await sessionManager.get(chatId);
    if (!latestDraft || latestDraft.id !== draftId) return;

    if (latestDraft.bufferTimestamp !== currentTimestamp) {
      return;
    }

    const lockedDraft = latestDraft.copyWith({
      state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
    });
    await sessionManager.save(lockedDraft);

    await QueueManager.add(chatId, update.userId, 'STAGE_1_INGEST', {}, container);
  };

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(processBufferTask());
  } else {
    processBufferTask();
  }
}
