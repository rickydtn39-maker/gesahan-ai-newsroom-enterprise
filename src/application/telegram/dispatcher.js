// FILE: src/application/telegram/dispatcher.js

import { WORKFLOW_STATE } from '../../core/constants/index.js';
import { TOKENS } from '../../core/container/tokens.js';
import { MESSAGES } from '../../core/constants/messages.js';
import { Draft } from '../../domain/draft/draft.js';

import { startCommand } from './commands/start-command.js';
import { helpCommand } from './commands/help-command.js';
import { cancelCommand } from './commands/cancel-command.js';
import { resetCommand } from './commands/reset-command.js';
import { statusCommand } from './commands/status-command.js';
import { setAuthorCommand } from './commands/setauthor-command.js';

// 🚀 IMPOR HANDLER UTAMA WORKFLOW HYBRID EDITOR
import {
  hybridWaitingTitleHandler,
  hybridWaitingBodyHandler,
  hybridWaitingImageHandler
} from './commands/hybrid-editor-command.js';

import { createMainKeyboard } from './keyboards/index.js';

import {
  addUserCommand,
  delUserCommand,
  listUsersCommand,
  setuserprofileCommand,
} from './commands/admin-commands.js';

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
  .registerStatic('📋 Status', statusCommand)
  .registerStatic('/cancel', cancelCommand)
  .registerStatic('❌ Batal', cancelCommand)
  .registerStatic('/reset', resetCommand)
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

    // =========================================================================
    // ✍️ INISIASI LANGSUNG WORKFLOW HYBRID EDITOR VIA "BERITA BARU"
    // =========================================================================
    if (text === '📰 Berita Baru' || text === '🆕 Berita Baru') {
      await services.sessionManager.cancel(chatId); // Flush sesi lama
      await services.sessionManager.create(chatId, userId, (cId, uId) => {
        return new Draft({ chatId: cId, userId: uId, state: WORKFLOW_STATE.HYBRID_WAITING_TITLE });
      });
      return await services.telegramApi.sendMessage(
        chatId,
        [
          '✍️ *ALUR KERJA HYBRID EDITOR AKTIF*',
          '━━━━━━━━━━━━━━━━━━━━━━━━',
          'Anda memegang kendali penuh atas judul dan narasi berita asli yang Anda kirim.',
          'AI Gemini bertindak sebagai Chief Editorial Intelligence untuk menyusun SEO serta metadata tanpa mengubah teks Anda sedikit pun.',
          '━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          'Silakan masukkan *Judul Berita* Anda:'
        ].join('\n')
      );
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

    // Guard Lockout: Mencegah spam gelembung chat saat Gemini/WordPress sedang memproses data
    if (
      draft?.state === WORKFLOW_STATE.HYBRID_ANALYZING ||
      draft?.state === WORKFLOW_STATE.HYBRID_PUBLISHING
    ) {
      return await services.telegramApi.sendMessage(
        chatId,
        '⏳ *Sistem sedang memproses data.* Silakan tunggu sejenak hingga proses aktif Anda selesai.'
      );
    }

    // =========================================================================
    // ROUTING HANDLER STATE WORKFLOW HYBRID EDITOR
    // =========================================================================
    if (draft?.state === WORKFLOW_STATE.HYBRID_WAITING_TITLE) {
      return await hybridWaitingTitleHandler(update, services.telegramApi, services.sessionManager);
    }

    if (draft?.state === WORKFLOW_STATE.HYBRID_WAITING_BODY) {
      return await hybridWaitingBodyHandler(update, services.telegramApi, services.sessionManager, services.container);
    }

    if (draft?.state === WORKFLOW_STATE.HYBRID_WAITING_IMAGE) {
      return await hybridWaitingImageHandler(update, services.telegramApi, services.sessionManager, services.container);
    }

    // Pesan bantuan jika pengguna mengirim input di luar alur kerja aktif
    return await services.telegramApi.sendMessage(
      chatId,
      'ℹ️ *Silakan tekan tombol "📰 Berita Baru" di bawah untuk mulai menulis berita.*',
      createMainKeyboard()
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
        '⚠️ *Terjadi kesalahan sistem internal.*\nSesi Anda telah direset otomatis. Silakan tekan tombol di bawah.',
        createMainKeyboard()
      );
    }
  }
}