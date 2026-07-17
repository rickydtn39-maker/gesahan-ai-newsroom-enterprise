export function createReviewKeyboard() {
  return {
    keyboard: [
      [
        {
          text: '📄 Lihat Artikel Lengkap',
        },
      ],
      [
        {
          text: '✏️ Edit Manual',
        },
        {
          text: '♻️ Rewrite Lagi',
        },
      ],
      [
        {
          text: '✅ Siap Publish',
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
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}
