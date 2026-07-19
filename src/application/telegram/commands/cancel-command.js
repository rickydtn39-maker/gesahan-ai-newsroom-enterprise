import { MESSAGES } from '../../../core/constants/messages.js';
import { createStartKeyboard } from '../keyboards/index.js';

export async function cancelCommand(update, telegramApi, sessionManager) {
  await sessionManager.cancel(update.chatId);

  return telegramApi.sendMessage(
    update.chatId,
    MESSAGES.WORKFLOW.CANCELLED,
    createStartKeyboard() // 🚀 WAJIB KLIK START: Menyodorkan tombol Mulai Ulang
  );
}