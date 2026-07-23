// FILE: src/application/telegram/commands/ocr-article-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/tokens.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { createDraft } from '../../services/editorial-session.js';
import { attachSourceText } from '../../services/draft-service.js';
import { QueueManager } from '../../../infrastructure/queue/queue-manager.js'; // 🚀 Impor Queue Manager

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

  await telegramApi.sendMessage(update.chatId, '🔍 *Memindai gambar/dokumen (OCR)...* Mohon tunggu sebentar.');

  try {
    const downloadedFile = await telegramApi.downloadFile(fileId);
    const ocrProvider = container.resolve(TOKENS.OCR_PROVIDER);
    const extractedText = await ocrProvider.extractText(
      downloadedFile.buffer,
      downloadedFile.mimeType
    );

    const draft = await sessionManager.get(update.chatId);
    const draftWithSource = attachSourceText(draft, extractedText);
    
    // Amankan status draf ke pemrosesan editorial
    const lockedDraft = draftWithSource.copyWith({
      state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
    });
    await sessionManager.save(lockedDraft);

    await telegramApi.sendMessage(update.chatId, MESSAGES.WORKFLOW.STAGE1_LOADING);

    // 🚀 MASUKKAN PROSES ANALISIS GEMINI SELESAI OCR KE QUEUE MANAGER (ANTREAN)
    await QueueManager.add(update.chatId, update.userId, 'STAGE_1_INGEST', {}, container);

  } catch (error) {
    await sessionManager.cancel(update.chatId);
    return telegramApi.sendMessage(
      update.chatId,
      `${MESSAGES.WORKFLOW.STAGE1_FAILED}${error.message}\n\nSesi dibatalkan.`
    );
  }
}