// FILE: src/domain/draft/draft.js

export class Draft {
  constructor({
    id,
    chatId,
    userId,
    state,
    source = {
      type: null,
      text: null,
      photo: null,
      document: null,
      featuredImage: null,
    },
    editorial = null,
    stage1 = null,
    stage1Multi = null, // 🚀 FIXED: Menambahkan properti stage1Multi agar tersimpan permanen di KV
    angle = null,
    published = null,
    bufferTimestamp = null,
    bufferPartCount = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
  }) {
    this.id = id || crypto.randomUUID();
    this.chatId = chatId;
    this.userId = userId;
    this.state = state;
    this.source = source;
    this.editorial = editorial;
    this.stage1 = stage1;
    this.stage1Multi = stage1Multi; // 🚀 FIXED: Bind ke instansi objek
    this.angle = angle;
    this.published = published;
    this.bufferTimestamp = bufferTimestamp;
    this.bufferPartCount = bufferPartCount;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    Object.freeze(this);
  }

  copyWith(changes) {
    return new Draft({
      id: this.id,
      chatId: this.chatId,
      userId: this.userId,
      state: this.state,
      source: this.source,
      editorial: this.editorial,
      stage1: this.stage1,
      stage1Multi: this.stage1Multi, // 🚀 FIXED: Pertahankan data saat disalin
      angle: this.angle,
      published: this.published,
      bufferTimestamp: this.bufferTimestamp,
      bufferPartCount: this.bufferPartCount,
      createdAt: this.createdAt,
      ...changes,
      updatedAt: new Date().toISOString(),
    });
  }
}