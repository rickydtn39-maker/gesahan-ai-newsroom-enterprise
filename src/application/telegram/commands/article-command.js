// FILE: src/application/telegram/commands/article-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/tokens.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { createDraft } from '../../services/editorial-session.js';
import { createAngleKeyboard } from '../keyboards/index.js';

export async function articleCommand(update, telegramApi, sessionManager, container) {
  let state = await sessionManager.getState(update.chatId);

  // Jika sesi baru dimulai
  if (state === WORKFLOW_STATE.IDLE) {
    await sessionManager.create(update.chatId, update.userId, createDraft);
    state = WORKFLOW_STATE.WAITING_ARTICLE;
  }

  // Tolak teks baru jika sistem sedang sibuk memproses AI di latar belakang
  if (state !== WORKFLOW_STATE.WAITING_ARTICLE) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.WORKFLOW.ACTIVE_PROCESS);
  }

  if (!update.hasText) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.INTERACTION.INPUT_TEXT_REQUIRED);
  }

  const draft = await sessionManager.get(update.chatId);
  const incomingText = (update.text || '').trim();
  
  // Menggabungkan potongan naskah secara dinamis dengan pembatas baris baru
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

  // Kirim indikator penerimaan hanya pada potongan pertama agar tidak spamming chat
  if (nextPartCount === 1) {
    await telegramApi.sendMessage(
      update.chatId,
      '📥 *Menerima naskah...* Menggabungkan potongan dokumen berikutnya jika ada (mohon tunggu 2 detik).'
    );
  }

  // =========================================================================
  // 🧠 DEBOUNCE BUFFER SCHEDULER
  // Menunggu jeda 2 detik untuk memastikan seluruh potongan teks selesai dikirim
  // =========================================================================
  const delayMs = 2000;
  const draftId = draft.id;
  const chatId = update.chatId;
  const ctx = container.has('ctx') ? container.resolve('ctx') : null;

  const processBufferTask = async () => {
    // Berikan jeda waktu penerimaan bagian selanjutnya
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Ambil status terbaru dari database KV
    const latestDraft = await sessionManager.get(chatId);
    if (!latestDraft || latestDraft.id !== draftId) return; // Sesi direset atau diganti

    // 🚀 VALIDASI KRITIS: Jika timestamp di KV sudah berubah, abaikan tugas ini!
    // Tugas dari potongan terakhir yang akan memproses draf secara utuh.
    if (latestDraft.bufferTimestamp !== currentTimestamp) {
      return;
    }

    // Jika tidak ada lagi potongan baru, kunci status draf dan mulai analisis
    const lockedDraft = latestDraft.copyWith({
      state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
    });
    await sessionManager.save(lockedDraft);

    await telegramApi.sendMessage(chatId, MESSAGES.WORKFLOW.STAGE1_LOADING);

    try {
      const editorialService = container.resolve(TOKENS.EDITORIAL_SERVICE);
      const stage1Result = await editorialService.ingestStage1(lockedDraft);

      const updatedDraft = lockedDraft.copyWith({
        state: WORKFLOW_STATE.WAITING_ANGLE,
        stage1: stage1Result,
      });

      await sessionManager.save(updatedDraft);

      const priorityIcons = {
        A: '🔴 [A - BREAKING NEWS]',
        B: '🟡 [B - PUBLISH TODAY]',
        C: '🟢 [C - EVERGREEN]',
      };

      return telegramApi.sendMessage(
        chatId,
        [
          '📊 *HASIL ANALISIS INGEST GEMINI (STAGE 1)*',
          '━━━━━━━━━━━━━━━━━━',
          `🏷️ *Kategori:* ${stage1Result.wordpress.category}`,
          `🔑 *Keyword:* ${stage1Result.seo.focusKeyword}`,
          `🚨 *Prioritas:* ${priorityIcons[stage1Result.priority] || stage1Result.priority}`,
          `📈 *News Score:* ${stage1Result.newsValue.score}/100`,
          `🎯 *Draf Sementara Reporter:* "${stage1Result.draftReporter.title}"`,
          '━━━━━━━━━━━━━━━━━━',
          '',
          '✍️ *STAGE 2: TENTUKAN SUDUT PANDANG (ANGLE)*',
          'Silakan ketik angle khusus Anda atau klik tombol di bawah untuk default AI.',
        ].join('\n'),
        createAngleKeyboard()
      );
    } catch (error) {
      await sessionManager.cancel(chatId);
      return telegramApi.sendMessage(
        chatId,
        `${MESSAGES.WORKFLOW.STAGE1_FAILED}${error.message}\n\nSesi dibatalkan.`
      );
    }
  };

  // Gunakan tameng background task Cloudflare Workers jika tersedia
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(processBufferTask());
  } else {
    processBufferTask();
  }
}