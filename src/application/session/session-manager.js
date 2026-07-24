import { WORKFLOW_STATE } from '../../core/constants/index.js';

export class SessionManager {
  constructor(draftRepository) {
    this.draftRepository = draftRepository;
    // Batas waktu toleransi jika proses AI/WordPress hang (3 menit)
    this.MAX_PROCESSING_TIME_MS = 3 * 60 * 1000;
  }

  async get(chatId) {
    let draft = await this.draftRepository.findByChatId(chatId);
    if (!draft) return null;

    // 🚀 SAFEGUARD: Jika draf tersangkut di state PROCESSING lebih dari 3 menit
    if (draft.state === WORKFLOW_STATE.PROCESSING && (draft.updatedAt || draft.createdAt)) {
      const lastUpdated = new Date(draft.updatedAt || draft.createdAt).getTime();
      const now = Date.now();

      if (now - lastUpdated > this.MAX_PROCESSING_TIME_MS) {
        // Otomatis lepaskan kuncian (reset ke IDLE) dengan meng-copy draft secara aman
        const resetDraft = draft.copyWith({ state: WORKFLOW_STATE.IDLE });
        draft = await this.save(resetDraft);
      }
    }

    return draft;
  }

  async create(chatId, userId, createDraft) {
    const existing = await this.get(chatId);

    if (existing) {
      return existing;
    }

    const initialDraft = createDraft(chatId, userId);

    // 🚀 Menambahkan timestamp secara imutabel menggunakan copyWith
    const draftWithTime = initialDraft.copyWith({
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await this.draftRepository.save(draftWithTime);

    return draftWithTime;
  }

  async save(draft) {
    if (!draft) return null;

    // 🚀 Update updatedAt secara imutabel sebelum dikirim ke repositori KV
    const updatedDraft = draft.copyWith({
      updatedAt: new Date().toISOString(),
    });

    await this.draftRepository.save(updatedDraft);
    return updatedDraft;
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
