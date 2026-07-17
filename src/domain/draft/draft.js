export class Draft {
  constructor({
    id,
    chatId,
    userId,
    state,
    source = null,
    article = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.chatId = chatId;
    this.userId = userId;
    this.state = state;
    this.source = source;
    this.article = article;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    Object.freeze(this);
  }
}