// FILE: src/application/telegram/commands/publish-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { QueueManager } from '../../../infrastructure/queue/queue-manager.js'; // 🚀 Impor Queue Manager

export async function publishNowCommand(update, telegramApi, sessionManager, container) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, 'Draft tidak ditemukan.');
  }

  if (!draft.source?.featuredImage) {
    return telegramApi.sendMessage(
      update.chatId,
      '❌ Foto unggulan wajib dikirim terlebih dahulu.'
    );
  }

  const lockedDraft = draft.copyWith({
    state: WORKFLOW_STATE.PUBLISHING,
  });
  await sessionManager.save(lockedDraft);

  // 🚀 MASUKKAN PROSES PENERBITAN WORDPRESS KE QUEUE MANAGER (ANTREAN)
  await QueueManager.add(update.chatId, update.userId, 'PUBLISH', {}, container);
}
