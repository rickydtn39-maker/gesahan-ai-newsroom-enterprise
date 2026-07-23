import { WORKFLOW_STATE } from '../../core/constants/index.js';

export class SessionManager {
  constructor(draftRepository) {
    this.draftRepository = draftRepository;
    // Batas waktu toleransi jika proses AI/WordPress hang (3 menit)
    this.MAX_PROCESSING_TIME_MS = 3 * 60 * 1000; 
  }

  async get(chatId) {
    const draft = await this.draftRepository.findByChatId(chatId);
    if (!draft) return null;

    // 🚀 SAFEGUARD: Jika draf tersangkut di state PROCESSING lebih dari 3 menit
    if (draft.state === WORKFLOW_STATE.PROCESSING && (draft.updatedAt || draft.createdAt)) {
      const lastUpdated = new Date(draft.updatedAt || draft.createdAt).getTime();
      const now = Date.now();

      if (now - lastUpdated > this.MAX_PROCESSING_TIME_MS) {
        // Otomatis lepaskan kuncian (reset ke IDLE)
        draft.state = WORKFLOW_STATE.IDLE;
        await this.save(draft);
      }
    }

    return draft;
  }

  async create(chatId, userId, createDraft) {
    const existing = await this.get(chatId);

    if (existing) {
      return existing;
    }

    const draft = createDraft(chatId, userId);
    draft.createdAt = new Date().toISOString();
    draft.updatedAt = new Date().toISOString();

    await this.draftRepository.save(draft);

    return draft;
  }

  async save(draft) {
    if (draft) {
      draft.updatedAt = new Date().toISOString();
    }
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