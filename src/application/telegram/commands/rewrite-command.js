export async function rewriteCommand(
  update,
  telegramApi
) {
  return telegramApi.sendMessage(
    update.chatId,
    [
      '♻️ Rewrite diminta.',
      '',
      'Fitur ini akan menjalankan Editorial Engine kembali menggunakan naskah asli.',
      '',
      'Sedang dalam implementasi.'
    ].join('\n')
  );
}