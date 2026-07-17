import { startCommand } from './commands/start-command.js';
import { cancelCommand } from './commands/cancel-command.js';
import { newArticleCommand } from './commands/new-article-command.js';

export async function dispatchTelegramUpdate(update, services) {
  const text = update.text ?? '';

  switch (text) {
    case '/start':
      return startCommand(update, services.telegramApi);

    case '🆕 Berita Baru':
      return newArticleCommand(
        update,
        services.telegramApi,
        services.draftRepository
      );

    case '/cancel':
    case '❌ Batal':
      return cancelCommand(
        update,
        services.telegramApi,
        services.draftRepository
      );

    default:
      return services.telegramApi.sendMessage(
        update.chatId,
        'Perintah belum dikenali. Tekan /start untuk memulai.'
      );
  }
}