export function createTelegramUpdate(update) {
  const message = update.message ?? {};

  const photos = message.photo ?? [];

  const largestPhoto = photos.length > 0 ? photos[photos.length - 1] : null;

  return Object.freeze({
    updateId: update.update_id ?? null,

    messageId: message.message_id ?? null,

    chatId: message.chat?.id ?? null,

    userId: message.from?.id ?? null,

    text: message.text ?? null,

    photo: largestPhoto,

    document: message.document ?? null,

    hasText: Boolean(message.text),

    hasPhoto: Boolean(largestPhoto),

    hasDocument: Boolean(message.document),
  });
}
