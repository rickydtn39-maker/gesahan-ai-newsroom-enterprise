import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';

export async function readyPublishCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.NOT_FOUND);
  }

  const updatedDraft = draft.copyWith({
    state: WORKFLOW_STATE.WAITING_FEATURED_IMAGE,
  });

  await sessionManager.save(updatedDraft);

  return telegramApi.sendMessage(
    update.chatId,
    [
      '✅ Artikel siap dipublikasikan.',
      '',
      'Silakan kirim foto unggulan.',
      '',
      'Setelah foto diterima saya akan menampilkan konfirmasi terakhir sebelum artikel diterbitkan.',
    ].join('\n')
  );
}
