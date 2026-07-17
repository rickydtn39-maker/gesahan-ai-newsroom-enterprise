import { WORKFLOW_STATE } from '../../core/constants/index.js';
import { TOKENS } from '../../core/container/index.js';

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
import { ocrArticleCommand } from './commands/ocr-article-command.js';

export async function dispatchTelegramUpdate(update, services) {
  // 🛡️ SECURITY GUARD: WHITELIST CHECK
  const config = services.container.resolve(TOKENS.CONFIGURATION);
  const allowedUsers = config.telegram.allowedUsers;

  if (allowedUsers && allowedUsers.length > 0 && !allowedUsers.includes(Number(update.userId))) {
    return services.telegramApi.sendMessage(
      update.chatId,
      '⛔ *AKSES DITOLAK*\n\nMaaf, ID Telegram Anda tidak terdaftar di sistem. Anda tidak memiliki izin untuk menggunakan GESAHAN AI Newsroom Enterprise.\n\nSilakan hubungi Administrator.'
    );
  }

  const text = update.text ?? '';

  switch (text) {
    case '/start':
      return startCommand(update, services.telegramApi);

    case '📰 Berita Baru':
    case '🆕 Berita Baru':
      return newArticleCommand(update, services.telegramApi, services.sessionManager);

    case '📄 Lihat Artikel Lengkap':
      return viewArticleCommand(update, services.telegramApi, services.sessionManager);

    case '✏️ Edit Manual':
      return editCommand(update, services.telegramApi, services.sessionManager);

    case '📋 Status':
      return statusCommand(update, services.telegramApi, services.sessionManager);

    case '✅ Siap Publish':
      return readyPublishCommand(update, services.telegramApi, services.sessionManager);

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
        services.telegramApi,
        services.sessionManager,
        services.container
      );

    case '/cancel':
    case '❌ Batal':
      return cancelCommand(update, services.telegramApi, services.sessionManager);

    default: {
      const draft = await services.sessionManager.get(update.chatId);

      // Routing khusus jika pengguna mengirim foto/dokumen
      if (update.hasPhoto || update.hasDocument) {
        if (draft?.state === WORKFLOW_STATE.WAITING_FEATURED_IMAGE && update.hasPhoto) {
          return featuredImageCommand(update, services.telegramApi, services.sessionManager);
        }

        return ocrArticleCommand(
          update,
          services.telegramApi,
          services.sessionManager,
          services.container
        );
      }

      if (draft?.state === WORKFLOW_STATE.WAITING_MANUAL_EDIT) {
        return manualEditSaveCommand(update, services.telegramApi, services.sessionManager);
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
