export async function cancelCommand(
  update,
  telegramApi,
  sessionManager
) {
  await sessionManager.cancel(update.chatId);

  return telegramApi.sendMessage(
    update.chatId,
    [
      '✅ Proses berhasil dibatalkan.',
      '',
      'Semua draft sementara telah dihapus.',
      '',
      'Tekan 🆕 Berita Baru untuk memulai kembali.'
    ].join('\n')
  );
}