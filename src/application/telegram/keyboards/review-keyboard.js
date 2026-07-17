export function createReviewKeyboard() {
  return {
    keyboard: [
      [
        {
          text: '♻️ Rewrite Lagi'
        }
      ],
      [
        {
          text: '✅ Publish'
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