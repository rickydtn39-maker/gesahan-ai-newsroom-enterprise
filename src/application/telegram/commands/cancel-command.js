// FILE: src/application/telegram/commands/cancel-command.js

import { MESSAGES } from '../../../core/constants/messages.js';
import { createStartKeyboard } from '../keyboards/index.js';

export async function cancelCommand(update, telegramApi, sessionManager) {
  const chatId =
    update.chatId || update.message?.chat?.id || update.callback_query?.message?.chat?.id;

  try {
    // Menghapus draf dan memulihkan state sesi secara menyeluruh
    if (chatId) {
      await sessionManager.cancel(chatId);
    }

    return await telegramApi.sendMessage(
      chatId,
      MESSAGES.WORKFLOW.CANCELLED,
      createStartKeyboard() // 🚀 WAJIB KLIK START: Menyodorkan tombol Mulai Ulang
    );
  } catch (_error) {
    return await telegramApi.sendMessage(
      chatId,
      '✅ Sesi berhasil dibatalkan dan direset. Silakan tekan /start untuk memulai kembali.',
      createStartKeyboard()
    );
  }
}
