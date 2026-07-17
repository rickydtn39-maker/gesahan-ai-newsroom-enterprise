export async function cancelCommand(
  update,
  telegramApi,
  draftRepository
) {
  await draftRepository.remove(update.chatId);

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