import { MESSAGES } from '../../../core/constants/messages.js';
import { createMainKeyboard } from '../keyboards/index.js';

export async function helpCommand(update, telegramApi) {
  return telegramApi.sendMessage(
    update.chatId,
    MESSAGES.INTERACTION.HELP_TEXT,
    createMainKeyboard()
  );
}
