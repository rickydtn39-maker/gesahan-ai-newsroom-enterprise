import { DraftStorage } from './draft-storage.js';

export class DraftRepository {
  constructor(namespace) {
    this.storage = new DraftStorage(namespace);
  }

  async findByChatId(chatId) {
    return this.storage.get(chatId);
  }

  async save(draft) {
    await this.storage.put(
      draft.chatId,
      draft
    );

    return draft;
  }

  async remove(chatId) {
    await this.storage.delete(chatId);
  }
}