import { WORKFLOW_STATE } from '../../../core/constants/index.js';

export async function editCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, 'Draft tidak ditemukan.');
  }

  const updatedDraft = {
    ...draft,
    state: WORKFLOW_STATE.WAITING_MANUAL_EDIT,
    updatedAt: new Date().toISOString(),
  };

  await sessionManager.save(updatedDraft);

  return telegramApi.sendMessage(
    update.chatId,
    [
      '✏ MODE EDIT MANUAL',
      '',
      'Silakan kirim versi akhir artikel.',
      '',
      'Artikel yang Anda kirim akan menggantikan hasil AI.',
      '',
      'Setelah itu Anda dapat langsung melakukan Publish.',
    ].join('\n')
  );
}
