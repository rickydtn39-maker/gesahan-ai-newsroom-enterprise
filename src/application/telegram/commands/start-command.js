import { createMainKeyboard } from '../keyboards/index.js';

export async function startCommand(update, telegramApi) {
  return telegramApi.sendMessage(
    update.chatId,
    [
      '👋 Selamat datang di GESAHAN AI NEWSROOM',
      '',
      'Saya adalah AI Editorial Assistant.',
      '',
      'Saya akan membantu mengubah naskah menjadi artikel siap terbit dengan standar redaksi.',
      '',
      'Silakan pilih menu di bawah.',
    ].join('\n'),
    createMainKeyboard()
  );
}
