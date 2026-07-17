import { WORKFLOW_STATE } from '../../core/constants/index.js';

import { startCommand } from './commands/start-command.js';
import { cancelCommand } from './commands/cancel-command.js';
import { newArticleCommand } from './commands/new-article-command.js';
import { articleCommand } from './commands/article-command.js';
import { statusCommand } from './commands/status-command.js';
import { readyPublishCommand } from './commands/ready-publish-command.js';
import { publishNowCommand } from './commands/publish-now-command.js';
import { rewriteCommand } from './commands/rewrite-command.js';
import { featuredImageCommand } from './commands/featured-image-command.js';
import { viewArticleCommand } from './commands/view-article-command.js';
import { editCommand } from './commands/edit-command.js';
import { manualEditSaveCommand } from './commands/manual-edit-save-command.js';

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

    case '📄 Lihat Artikel Lengkap':
      return viewArticleCommand(
        update,
        services.telegramApi,
        services.sessionManager
      );

    case '✏️ Edit Manual':
      return editCommand(
        update,
        services.telegramApi,
        services.sessionManager
      );

    case '📋 Status':
      return statusCommand(
        update,
        services.telegramApi,
        services.sessionManager
      );

    case '✅ Siap Publish':
      return readyPublishCommand(
        update,
        services.telegramApi,
        services.sessionManager
      );

    case '🚀 Publish Sekarang':
      return publishNowCommand(
        update,
        services.telegramApi,
        services.sessionManager,
        services.container
      );

    case '♻️ Rewrite Lagi':
      return rewriteCommand(
        update,
        services.telegramApi
      );

    case '/cancel':
    case '❌ Batal':
      return cancelCommand(
        update,
        services.telegramApi,
        services.sessionManager
      );

    default: {
      if (update.hasPhoto) {
        return featuredImageCommand(
          update,
          services.telegramApi,
          services.sessionManager
        );
      }

      const draft = await services.sessionManager.get(update.chatId);

      if (draft?.state === WORKFLOW_STATE.WAITING_MANUAL_EDIT) {
        return manualEditSaveCommand(
          update,
          services.telegramApi,
          services.sessionManager
        );
      }

      return articleCommand(
        update,
        services.telegramApi,
        services.sessionManager,
        services.container
      );
    }
  }
}