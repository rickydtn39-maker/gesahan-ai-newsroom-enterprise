import { WORKFLOW_STATE } from '../../../core/constants/index.js';

export async function publishCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, 'Draft tidak ditemukan.');
  }

  const updatedDraft = {
    ...draft,
    state: WORKFLOW_STATE.WAITING_FEATURED_IMAGE,
    updatedAt: new Date().toISOString(),
  };

  await sessionManager.save(updatedDraft);

  return telegramApi.sendMessage(
    update.chatId,
    [
      '✅ Artikel disetujui.',
      '',
      'Silakan kirim foto unggulan.',
      '',
      'Format:',
      '📷 Foto resolusi terbaik.',
    ].join('\n')
  );
}
