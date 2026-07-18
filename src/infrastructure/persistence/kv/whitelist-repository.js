const KEY = 'newsroom:whitelist';

export class WhitelistRepository {
  constructor(namespace) {
    this.namespace = namespace;
  }

  async getAll() {
    const value = await this.namespace.get(KEY, {
      type: 'json'
    });
    return value || [];
  }

  async save(list) {
    await this.namespace.put(
      KEY,
      JSON.stringify(list)
    );
  }
}