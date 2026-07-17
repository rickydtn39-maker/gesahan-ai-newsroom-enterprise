export function createTelegramUpdate(update) {
  const message = update.message ?? {};

  return Object.freeze({
    updateId: update.update_id ?? null,

    messageId: message.message_id ?? null,

    chatId: message.chat?.id ?? null,

    userId: message.from?.id ?? null,

    text: message.text ?? null,

    photo: message.photo ?? null,

    document: message.document ?? null,

    hasText: Boolean(message.text),

    hasPhoto: Array.isArray(message.photo),

    hasDocument: Boolean(message.document)
  });
}