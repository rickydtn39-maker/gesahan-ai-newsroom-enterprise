import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';

export async function editCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.NOT_FOUND);
  }

  const updatedDraft = draft.copyWith({
    state: WORKFLOW_STATE.WAITING_MANUAL_EDIT,
  });

  await sessionManager.save(updatedDraft);

  return telegramApi.sendMessage(update.chatId, MESSAGES.MANUAL_EDIT.PROMPT);
}
