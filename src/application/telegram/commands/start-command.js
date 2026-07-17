export async function startCommand(update, telegramApi) {
  return telegramApi.sendMessage(
    update.chatId,
    [
      '👋 Selamat datang di GESAHAN AI NEWSROOM',
      '',
      'Silakan pilih menu di bawah.',
      '',
      '🆕 Berita Baru',
      '❌ Batal'
    ].join('\n'),
    {
      keyboard: [
        [
          {
            text: '🆕 Berita Baru'
          }
        ],
        [
          {
            text: '❌ Batal'
          }
        ]
      ],
      resize_keyboard: true
    }
  );
}