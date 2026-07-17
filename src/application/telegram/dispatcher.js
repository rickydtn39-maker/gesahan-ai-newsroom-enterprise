import { startCommand } from './commands/start-command.js';
import { cancelCommand } from './commands/cancel-command.js';
import { newArticleCommand } from './commands/new-article-command.js';
import { articleCommand } from './commands/article-command.js';

export async function dispatchTelegramUpdate(update, services) {
  const text = update.text ?? '';

  switch (text) {
    case '/start':
      return startCommand(update, services.telegramApi);

    case '📰 Berita Baru':
    case '🆕 Berita Baru':
      return newArticleCommand(
        update,
        services.telegramApi,
        services.sessionManager
      );

    case '/cancel':
    case '❌ Batal':
      return cancelCommand(
        update,
        services.telegramApi,
        services.sessionManager
      );

    default:
      return articleCommand(
        update,
        services.telegramApi,
        services.sessionManager,
        services.context
      );
  }
}