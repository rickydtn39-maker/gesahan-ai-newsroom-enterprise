export function createMainKeyboard() {
  return {
    keyboard: [
      [
        {
          text: '🆕 Berita Baru'
        }
      ],
      [
        {
          text: 'ℹ️ Bantuan'
        },
        {
          text: '❌ Batal'
        }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}