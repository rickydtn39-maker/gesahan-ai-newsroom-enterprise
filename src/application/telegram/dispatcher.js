// FILE: src/application/telegram/dispatcher.js

import { WORKFLOW_STATE } from '../../core/constants/index.js';
import { TOKENS } from '../../core/container/tokens.js';
import { MESSAGES } from '../../core/constants/messages.js';

import { startCommand } from './commands/start-command.js';
import { helpCommand } from './commands/help-command.js';
import { cancelCommand } from './commands/cancel-command.js';
import { resetCommand } from './commands/reset-command.js'; // 🚀 Impor Reset Command Baru
import { newArticleCommand } from './commands/new-article-command.js';
import { articleCommand } from './commands/article-command.js';
import { statusCommand } from './commands/status-command.js';
import { readyPublishCommand } from './commands/ready-publish-command.js';
import { publishNowCommand } from './commands/publish-command.js';
import { rewriteCommand } from './commands/rewrite-command.js';
import { featuredImageCommand } from './commands/featured-image-command.js';
import { viewArticleCommand } from './commands/view-article-command.js';
import { editCommand } from './commands/edit-command.js';
import { manualEditSaveCommand } from './commands/manual-edit-save-command.js';
import { ocrArticleCommand } from './commands/ocr-article-command.js';
import { angleSaveCommand } from './commands/angle-save-command.js';
import { setAuthorCommand } from './commands/setauthor-command.js';
import { themeSelectionCommand } from './commands/theme-selection-command.js';

import {
  addUserCommand,
  delUserCommand,
  listUsersCommand,
  setuserprofileCommand,
} from './commands/admin-commands.js';
import { createMainKeyboard } from './keyboards/index.js';

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
  .registerStatic('/reset', resetCommand) // 🚀 Daftarkan rute reset darurat
  .registerStatic('🔄 Reset Sistem', resetCommand)
  .registerAdmin('/adduser', addUserCommand)
  .registerAdmin('/deluser', delUserCommand)
  .registerAdmin('/listusers', listUsersCommand)
  .registerAdmin('/setuserprofile', setuserprofileCommand);

export async function dispatchTelegramUpdate(update, services) {
  const logger = services.container.resolve(TOKENS.LOGGER);

  try {
    const config = services.container.resolve(TOKENS.CONFIGURATION);
    const whitelistRepo = services.container.resolve(TOKENS.WHITELIST_REPOSITORY);

    const chatId =
      update.chatId || update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    const userId = Number(
      update.userId || update.message?.from?.id || update.callback_query?.from?.id
    );
    const text = (update.text || update.message?.text || update.callback_query?.data || '').trim();

    if (chatId && Number(chatId) < 0) {
      logger.debug('Ignored group message to prevent session collision', { chatId });
      return;
    }

    const allowedUsersEnv = config.telegram.allowedUsers || [];
    const dynamicWhitelist = await whitelistRepo.getAll();
    const allowedUsersKv = dynamicWhitelist.map((user) => Number(user.userId));

    const isSuperAdmin = allowedUsersEnv.includes(userId);
    const isAllowedUser = isSuperAdmin || allowedUsersKv.includes(userId);

    if (!isAllowedUser && allowedUsersEnv.length > 0) {
      logger.warn('Unauthorized access attempt blocked', { userId, chatId });
      return services.telegramApi.sendMessage(chatId, MESSAGES.AUTH.UNAUTHORIZED);
    }

    if (text === '🏁 Selesai & Tutup') {
      logger.info('Closing multi-theme session', { chatId });
      await services.sessionManager.cancel(chatId);
      return await services.telegramApi.sendMessage(
        chatId,
        '✅ *Sesi Podcast Berhasil Ditutup.*\n\nSisa draf tema telah dibersihkan secara aman dari database. Silakan klik menu di bawah untuk memulai kembali.',
        createMainKeyboard()
      );
    }

    if (text === '/cancel' || text === '❌ Batal' || text === '/start' || text === '🏁 Mulai') {
      logger.info('Executing emergency session reset', { command: text, chatId });
      await services.sessionManager.cancel(chatId);
    }

    if (isSuperAdmin) {
      for (const [prefix, handler] of registry.adminCommands.entries()) {
        if (text === prefix || text.startsWith(prefix + ' ')) {
          return await handler(update, services.telegramApi, whitelistRepo);
        }
      }
    }

    if (text.startsWith('/setauthor')) {
      return await setAuthorCommand(update, services.telegramApi, whitelistRepo, config);
    }

    const staticHandler = registry.staticCommands.get(text);
    if (staticHandler) {
      logger.info('Executing static command', { command: text });
      return await staticHandler(
        update,
        services.telegramApi,
        services.sessionManager,
        services.container
      );
    }

    const draft = await services.sessionManager.get(chatId);

    if (draft?.state === WORKFLOW_STATE.WAITING_THEME_SELECTION) {
      return await themeSelectionCommand(update, services.telegramApi, services.sessionManager);
    }

    if (update.hasPhoto || update.hasDocument) {
      if (draft?.state === WORKFLOW_STATE.WAITING_FEATURED_IMAGE && update.hasPhoto) {
        return await featuredImageCommand(update, services.telegramApi, services.sessionManager);
      }
      return await ocrArticleCommand(
        update,
        services.telegramApi,
        services.sessionManager,
        services.container
      );
    }

    if (draft?.state === WORKFLOW_STATE.WAITING_MANUAL_EDIT) {
      return await manualEditSaveCommand(update, services.telegramApi, services.sessionManager);
    }

    if (draft?.state === WORKFLOW_STATE.WAITING_ANGLE) {
      return await angleSaveCommand(
        update,
        services.telegramApi,
        services.sessionManager,
        services.container
      );
    }

    return await articleCommand(
      update,
      services.telegramApi,
      services.sessionManager,
      services.container,
      services.origin
    );
  } catch (error) {
    logger.error('Critical unhandled error in dispatcher', {
      error: error.message,
      stack: error.stack,
    });

    const targetChatId =
      update.chatId || update.message?.chat?.id || update.callback_query?.message?.chat?.id;

    if (targetChatId) {
      try {
        await services.sessionManager.cancel(targetChatId);
      } catch (e) {
        logger.error('Failed to reset session on panic fallback', { error: e.message });
      }

      return services.telegramApi.sendMessage(
        targetChatId,
        '⚠️ *Terjadi kesalahan sistem internal.*\nSesi Anda telah direset otomatis. Silakan kirimkan kembali perintah Anda atau ketik /start.'
      );
    }
  }
}