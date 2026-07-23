// FILE: src/application/telegram/commands/angle-save-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { QueueManager } from '../../../infrastructure/queue/queue-manager.js'; // 🚀 Impor Queue Manager

export async function angleSaveCommand(update, telegramApi, sessionManager, container) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft || draft.state !== WORKFLOW_STATE.WAITING_ANGLE) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.NOT_FOUND);
  }

  const textInput = (update.text || '').trim();
  const isDefaultAi = textInput === '⏭️ Lanjut (Default AI)';
  const selectedAngle = isDefaultAi ? null : textInput;

  const updatedDraftWithAngle = draft.copyWith({
    state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
    angle: selectedAngle,
  });

  await sessionManager.save(updatedDraftWithAngle);

  await telegramApi.sendMessage(
    update.chatId,
    isDefaultAi
      ? '⏳ [STAGE 3 & 4] GPT Redaktur Pelaksana sedang menyunting draf & melakukan QC mandiri...'
      : `⏳ [STAGE 3 & 4] GPT Redaktur Pelaksana sedang menyunting draf dengan fokus angle "${selectedAngle}" & melakukan QC...`
  );

  // 🚀 MASUKKAN PROSES PENYUNTINGAN GPT-4o KE QUEUE MANAGER (ANTREAN)
  await QueueManager.add(update.chatId, update.userId, 'STAGE_3_GENERATE', {}, container);
}