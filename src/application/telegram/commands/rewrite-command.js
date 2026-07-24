// FILE: src/application/telegram/commands/rewrite-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { QueueManager } from '../../../infrastructure/queue/queue-manager.js'; // 🚀 Impor Queue Manager

export async function rewriteCommand(update, telegramApi, sessionManager, container) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.NOT_FOUND);
  }

  if (draft.state !== WORKFLOW_STATE.WAITING_REVIEW) {
    return telegramApi.sendMessage(
      update.chatId,
      'Sistem tidak dapat melakukan rewrite pada tahap ini.'
    );
  }

  const lockedDraft = draft.copyWith({
    state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
  });
  await sessionManager.save(lockedDraft);

  await telegramApi.sendMessage(
    update.chatId,
    '⏳ Menginstruksikan AI untuk menulis ulang artikel dari naskah asli...'
  );

  // 🚀 MASUKKAN PROSES REWRITE GPT-4o KE QUEUE MANAGER (ANTREAN)
  await QueueManager.add(update.chatId, update.userId, 'STAGE_3_GENERATE', {}, container);
}
