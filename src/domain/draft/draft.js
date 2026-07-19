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
    angle = null,
    published = null,
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
    this.angle = angle;
    this.published = published;
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
      angle: this.angle,
      published: this.published,
      createdAt: this.createdAt,
      ...changes,
      updatedAt: new Date().toISOString(),
    });
  }
}
