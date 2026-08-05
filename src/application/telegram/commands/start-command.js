// FILE: src/application/telegram/commands/start-command.js

import { createStartSelectionKeyboard } from '../keyboards/start-selection-keyboard.js';
import { MESSAGES } from '../../../core/constants/messages.js';

export async function startCommand(update, telegramApi) {
  return telegramApi.sendMessage(
    update.chatId,
    MESSAGES.INTERACTION.START_WELCOME,
    createStartSelectionKeyboard() // 🚀 Menggunakan tombol seleksi hybrid/otomatis
  );
}
