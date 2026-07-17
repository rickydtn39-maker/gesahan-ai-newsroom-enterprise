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
      document: null
    },

    editorial = null,

    createdAt = new Date().toISOString(),

    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.chatId = chatId;
    this.userId = userId;

    this.state = state;

    this.source = source;

    this.editorial = editorial;

    this.createdAt = createdAt;

    this.updatedAt = updatedAt;

    Object.freeze(this);
  }
}