import { WORKFLOW_STATE } from '../../core/constants/index.js';

export class SessionManager {
  constructor(draftRepository) {
    this.draftRepository = draftRepository;
  }

  async get(chatId) {
    return this.draftRepository.findByChatId(chatId);
  }

  async create(chatId, userId, createDraft) {
    const existing = await this.get(chatId);

    if (existing) {
      return existing;
    }

    const draft = createDraft(chatId, userId);

    await this.draftRepository.save(draft);

    return draft;
  }

  async save(draft) {
    return this.draftRepository.save(draft);
  }

  async cancel(chatId) {
    await this.draftRepository.remove(chatId);
  }

  async getState(chatId) {
    const draft = await this.get(chatId);

    if (!draft) {
      return WORKFLOW_STATE.IDLE;
    }

    return draft.state;
  }
}