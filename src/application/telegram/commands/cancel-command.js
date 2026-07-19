import { MESSAGES } from '../../../core/constants/messages.js';

export async function cancelCommand(update, telegramApi, sessionManager) {
  await sessionManager.cancel(update.chatId);

  return telegramApi.sendMessage(update.chatId, MESSAGES.WORKFLOW.CANCELLED);
}
