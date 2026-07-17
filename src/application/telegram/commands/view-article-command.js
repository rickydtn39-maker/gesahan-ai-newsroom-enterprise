export async function viewArticleCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, 'Tidak ada draft aktif.');
  }

  if (!draft.editorial) {
    return telegramApi.sendMessage(update.chatId, 'Artikel belum tersedia.');
  }

  const article = draft.editorial.article;

  return telegramApi.sendMessage(
    update.chatId,
    [
      '📰 JUDUL',
      '',
      article.title,
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      '📝 LEAD',
      '',
      article.lead,
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      '📄 ARTIKEL',
      '',
      article.content,
    ].join('\n')
  );
}
