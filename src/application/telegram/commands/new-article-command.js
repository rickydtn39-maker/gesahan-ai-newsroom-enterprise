import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { createDraft } from '../../services/editorial-session.js';

export async function newArticleCommand(update, telegramApi, sessionManager) {
  const state = await sessionManager.getState(update.chatId);

  if (state !== WORKFLOW_STATE.IDLE) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.SESSION_ACTIVE_ERROR);
  }

  await sessionManager.create(update.chatId, update.userId, createDraft);

  return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.NEW_CREATED);
}
