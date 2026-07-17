import { Draft } from '../../domain/draft/draft.js';

import { WORKFLOW_STATE } from '../../core/constants/index.js';

export function createDraft(chatId, userId) {
  return new Draft({
    id: crypto.randomUUID(),

    chatId,

    userId,

    state: WORKFLOW_STATE.WAITING_ARTICLE
  });
}