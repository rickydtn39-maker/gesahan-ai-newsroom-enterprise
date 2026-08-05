// FILE: src/application/telegram/keyboards/main-keyboard.js

export function createMainKeyboard() {
  return {
    keyboard: [
      [
        {
          text: '📰 Berita Baru',
        },
      ],
      [
        {
          text: '📋 Status',
        },
        {
          text: '❌ Batal',
        },
      ],
      [
        {
          text: 'ℹ️ Bantuan',
        },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}