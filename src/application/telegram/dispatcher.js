// FILE: src/application/telegram/dispatcher.js

import { WORKFLOW_STATE } from '../../core/constants/index.js';
import { TOKENS } from '../../core/container/tokens.js';
import { MESSAGES } from '../../core/constants/messages.js';

import { startCommand } from './commands/start-command.js';
import { helpCommand } from './commands/help-command.js';
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
import { angleSaveCommand } from './commands/angle-save-command.js';
import { setAuthorCommand } from './commands/setauthor-command.js';

import { addUserCommand, delUserCommand, listUsersCommand } from './commands/admin-commands.js';

class CommandRegistry {
  constructor() {
    this.staticCommands = new Map();
    this.adminCommands = new Map();
  }

  registerStatic(text, handler) {
    this.staticCommands.set(text, handler);
    return this;
  }

  registerAdmin(prefix, handler) {
    this.adminCommands.set(prefix, handler);
    return this;
  }
}

const registry = new CommandRegistry()
  .registerStatic('/start', startCommand)
  .registerStatic('🏁 Mulai', startCommand)
  .registerStatic('/help', helpCommand)
  .registerStatic('ℹ️ Bantuan', helpCommand)
  .registerStatic('📰 Berita Baru', newArticleCommand)
  .registerStatic('🆕 Berita Baru', newArticleCommand)
  .registerStatic('📄 Lihat Artikel Lengkap', viewArticleCommand)
  .registerStatic('✏️ Edit Manual', editCommand)
  .registerStatic('📋 Status', statusCommand)
  .registerStatic('✅ Siap Publish', readyPublishCommand)
  .registerStatic('🚀 Publish Sekarang', publishNowCommand)
  .registerStatic('♻️ Rewrite Lagi', rewriteCommand)
  .registerStatic('/cancel', cancelCommand)
  .registerStatic('❌ Batal', cancelCommand)
  .registerAdmin('/adduser', addUserCommand)
  .registerAdmin('/deluser', delUserCommand)
  .registerAdmin('/listusers', listUsersCommand);

export async function dispatchTelegramUpdate(update, services) {
  const config = services.container.resolve(TOKENS.CONFIGURATION);
  const whitelistRepo = services.container.resolve(TOKENS.WHITELIST_REPOSITORY);
  const logger = services.container.resolve(TOKENS.LOGGER);

  // =========================================================================
  // 🚀 PENYARING KEAMANAN (SAFETY GUARD CLAUSE)
  // Abaikan semua pesan masuk jika berasal dari Grup (ID bernilai Negatif).
  // Bot hanya merespon input dari obrolan pribadi / DM (ID bernilai Positif).
  // =========================================================================
  if (update.chatId && Number(update.chatId) < 0) {
    logger.debug('Ignored group message to prevent session collision', { chatId: update.chatId });
    return; // Keluar secara sunyi tanpa membalas chat di grup
  }

  const allowedUsersEnv = config.telegram.allowedUsers || [];
  const dynamicWhitelist = await whitelistRepo.getAll();
  const allowedUsersKv = dynamicWhitelist.map((user) => Number(user.userId));

  const userId = Number(update.userId);
  const isSuperAdmin = allowedUsersEnv.includes(userId);
  const isAllowedUser = isSuperAdmin || allowedUsersKv.includes(userId);

  if (!isAllowedUser && allowedUsersEnv.length > 0) {
    logger.warn('Unauthorized access attempt blocked', { userId, chatId: update.chatId });
    return services.telegramApi.sendMessage(update.chatId, MESSAGES.AUTH.UNAUTHORIZED);
  }

  const text = (update.text ?? '').trim();

  // Executing Admin Commands
  if (isSuperAdmin) {
    for (const [prefix, handler] of registry.adminCommands.entries()) {
      if (text === prefix || text.startsWith(prefix + ' ')) {
        return handler(update, services.telegramApi, whitelistRepo);
      }
    }
  }

  // Author Multi-Author Command
  if (text.startsWith('/setauthor')) {
    return setAuthorCommand(update, services.telegramApi, whitelistRepo, config);
  }

  // Executing Static Commands
  const staticHandler = registry.staticCommands.get(text);
  if (staticHandler) {
    logger.info('Executing static command', { command: text });
    return staticHandler(update, services.telegramApi, services.sessionManager, services.container);
  }

  // Executing Dynamic Workflow State
  const draft = await services.sessionManager.get(update.chatId);

  if (update.hasPhoto || update.hasDocument) {
    if (draft?.state === WORKFLOW_STATE.WAITING_FEATURED_IMAGE && update.hasPhoto) {
      return featuredImageCommand(update, services.telegramApi, services.sessionManager);
    }
    return ocrArticleCommand(update, services.telegramApi, services.sessionManager, services.container);
  }

  if (draft?.state === WORKFLOW_STATE.WAITING_MANUAL_EDIT) {
    return manualEditSaveCommand(update, services.telegramApi, services.sessionManager);
  }

  if (draft?.state === WORKFLOW_STATE.WAITING_ANGLE) {
    return angleSaveCommand(update, services.telegramApi, services.sessionManager, services.container);
  }

  return articleCommand(update, services.telegramApi, services.sessionManager, services.container);
}