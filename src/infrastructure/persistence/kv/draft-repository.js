// FILE: src/infrastructure/persistence/kv/draft-repository.js

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

  // 🚀 METODE BARU: Menyimpan potongan teks ke dalam laci kunci KV yang unik per gelembung pesan
  async saveBufferPart(chatId, messageId, type, text) {
    const key = `newsroom:buffer:${type}:${chatId}:${messageId || crypto.randomUUID()}`;
    await this.storage.namespace.put(key, text);
  }

  // 🚀 METODE BARU: Mengunduh semua potongan teks, menyusunnya secara urut, dan menghapus sisa buffer
  async getAndClearCombinedBuffer(chatId, type) {
    const prefix = `newsroom:buffer:${type}:${chatId}:`;
    const list = await this.storage.namespace.list({ prefix });

    if (list.keys.length === 0) return '';

    // Urutkan kunci secara kronologis berdasarkan ID Pesan Telegram (bagian akhir nama kunci)
    const sortedKeys = list.keys.sort((a, b) => {
      const partsA = a.name.split(':');
      const partsB = b.name.split(':');
      const idA = parseInt(partsA[partsA.length - 1], 10) || 0;
      const idB = parseInt(partsB[partsB.length - 1], 10) || 0;
      return idA - idB;
    });

    const textParts = [];
    for (const key of sortedKeys) {
      const val = await this.storage.namespace.get(key.name);
      if (val) {
        textParts.push(val.trim());
      }
    }

    // Bersihkan seluruh kunci buffer dari KV secara asinkron (non-blocking)
    for (const key of list.keys) {
      await this.storage.namespace.delete(key.name);
    }

    // Gabungkan kembali potongan teks menggunakan newline ganda (paragraf baru)
    return textParts.join('\n\n');
  }
}