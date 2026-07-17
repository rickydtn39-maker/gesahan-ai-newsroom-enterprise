export function createTelegramUpdate(update) {
  const message = update.message ?? {};

  return Object.freeze({
    updateId: update.update_id ?? null,

    chatId: message.chat?.id ?? null,

    userId: message.from?.id ?? null,

    text: message.text ?? null,

    photo: message.photo ?? null,

    document: message.document ?? null
  });
}