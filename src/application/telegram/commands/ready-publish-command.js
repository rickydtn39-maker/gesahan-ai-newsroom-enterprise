import { WORKFLOW_STATE } from '../../../core/constants/index.js';

export async function readyPublishCommand(
  update,
  telegramApi,
  sessionManager
) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(
      update.chatId,
      'Draft tidak ditemukan.'
    );
  }

  const updatedDraft = {
    ...draft,
    state: WORKFLOW_STATE.WAITING_FEATURED_IMAGE,
    updatedAt: new Date().toISOString()
  };

  await sessionManager.save(updatedDraft);

  return telegramApi.sendMessage(
    update.chatId,
    [
      '✅ Artikel siap dipublikasikan.',
      '',
      'Silakan kirim foto unggulan.',
      '',
      'Setelah foto diterima saya akan menampilkan konfirmasi terakhir sebelum artikel diterbitkan.'
    ].join('\n')
  );
}