import { DraftStorage } from './draft-storage.js';
import { Draft } from '../../../domain/draft/draft.js';

export class DraftRepository {
  constructor(namespace) {
    this.storage = new DraftStorage(namespace);
  }

  async findByChatId(chatId) {
    const data = await this.storage.get(chatId);
    if (!data) return null;
    return new Draft(data);
  }

  async save(draft) {
    await this.storage.put(draft.chatId, draft);
    return draft;
  }

  async remove(chatId) {
    await this.storage.delete(chatId);
  }

  async archiveDraftMemory(publishedId, archivePayload) {
    const archivedKey = `newsroom:memory:${publishedId}`;
    await this.storage.namespace.put(
      archivedKey,
      JSON.stringify({
        ...archivePayload,
        archivedAt: new Date().toISOString(),
      })
    );
  }
}
