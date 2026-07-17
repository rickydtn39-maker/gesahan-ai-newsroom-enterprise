export async function statusCommand(
  update,
  telegramApi,
  sessionManager
) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(
      update.chatId,
      [
        'Tidak ada draft aktif.',
        '',
        'Tekan 📰 Berita Baru untuk memulai.'
      ].join('\n')
    );
  }

  const editorial = draft.editorial;

  return telegramApi.sendMessage(
    update.chatId,
    [
      '📋 STATUS DRAFT',
      '',
      `ID : ${draft.id}`,
      `State : ${draft.state}`,
      '',
      editorial
        ? `Judul : ${editorial.article.title}`
        : 'Judul : -',
      '',
      editorial
        ? `Jumlah Kata : ${editorial.statistics.wordCount}`
        : 'Jumlah Kata : -',
      editorial
        ? `Estimasi Baca : ${editorial.statistics.readingTime} menit`
        : 'Estimasi Baca : -'
    ].join('\n')
  );
}