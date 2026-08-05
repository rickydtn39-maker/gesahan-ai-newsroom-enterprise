// FILE: src/application/telegram/commands/start-command.js

import { createMainKeyboard } from '../keyboards/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';

export async function startCommand(update, telegramApi) {
  return telegramApi.sendMessage(
    update.chatId,
    MESSAGES.INTERACTION.START_WELCOME,
    createMainKeyboard() // 🚀 Langsung menyuguhkan keyboard utama sederhana
  );
}