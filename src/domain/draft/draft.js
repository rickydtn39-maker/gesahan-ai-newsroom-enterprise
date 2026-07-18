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
    },

    editorial = null,
    stage1 = null,
    angle = null,
    published = null,

    createdAt = new Date().toISOString(),

    updatedAt = new Date().toISOString(),
  }) {
    this.id = id;
    this.chatId = chatId;
    this.userId = userId;

    this.state = state;

    this.source = source;

    this.editorial = editorial;

    // Memetakan properti agar tidak hilang saat transisi instansiasi ulang
    this.stage1 = stage1;

    this.angle = angle;

    this.published = published;

    this.createdAt = createdAt;

    this.updatedAt = updatedAt;

    Object.freeze(this);
  }
}