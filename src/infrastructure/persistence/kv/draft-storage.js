const PREFIX = 'newsroom:draft:';

export class DraftStorage {
  constructor(namespace) {
    this.namespace = namespace;
  }

  createKey(chatId) {
    return `${PREFIX}${chatId}`;
  }

  async get(chatId) {
    const key = this.createKey(chatId);

    const value = await this.namespace.get(key, {
      type: 'json',
    });

    return value;
  }

  async put(chatId, draft) {
    const key = this.createKey(chatId);

    await this.namespace.put(key, JSON.stringify(draft));
  }

  async delete(chatId) {
    const key = this.createKey(chatId);

    await this.namespace.delete(key);
  }
}
