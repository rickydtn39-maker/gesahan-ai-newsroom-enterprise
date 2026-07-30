// FILE: src/application/telegram/commands/ocr-article-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { createDraft } from '../../services/editorial-session.js';
import { QueueManager } from '../../../infrastructure/queue/queue-manager.js';

export async function ocrArticleCommand(update, telegramApi, sessionManager, container) {
  let state = await sessionManager.getState(update.chatId);

  if (state === WORKFLOW_STATE.IDLE) {
    await sessionManager.create(update.chatId, update.userId, createDraft);
    state = WORKFLOW_STATE.WAITING_ARTICLE;
  }

  if (state !== WORKFLOW_STATE.WAITING_ARTICLE && state !== WORKFLOW_STATE.IDLE) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.WORKFLOW.ACTIVE_PROCESS);
  }

  const fileId = update.photo ? update.photo.file_id : update.document?.file_id;
  if (!fileId) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.OCR.INPUT_INVALID);
  }

  try {
    const draft = await sessionManager.get(update.chatId);

    // Kunci status sesi draf ke pemrosesan editorial
    const lockedDraft = draft.copyWith({
      state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
      source: {
        ...draft.source,
        type: 'photo',
      },
    });
    await sessionManager.save(lockedDraft);

    await telegramApi.sendMessage(
      update.chatId,
      '⏳ *Naskah Anda Masuk Antrean Cloud!* Sistem sedang menjadwalkan giliran OCR & klasifikasi data berita Anda...'
    );

    // 🚀 MASUKKAN KE ANTREAN: Lewatkan fileId ke payload untuk diproses serial di Queue Manager
    await QueueManager.add(
      update.chatId,
      update.userId,
      'STAGE_1_INGEST',
      { ocrFileId: fileId },
      container
    );
  } catch (error) {
    await sessionManager.cancel(update.chatId);
    return telegramApi.sendMessage(
      update.chatId,
      `${MESSAGES.WORKFLOW.STAGE1_FAILED}${error.message}\n\nSesi dibatalkan.`
    );
  }
}
