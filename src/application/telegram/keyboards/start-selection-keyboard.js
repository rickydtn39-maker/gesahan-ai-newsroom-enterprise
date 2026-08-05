// FILE: src/application/telegram/keyboards/start-selection-keyboard.js

export function createStartSelectionKeyboard() {
  return {
    keyboard: [
      [{ text: '🤖 Otomatis Pipeline' }, { text: '✍️ Hybrid Editor' }],
      [{ text: 'ℹ️ Bantuan' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}
