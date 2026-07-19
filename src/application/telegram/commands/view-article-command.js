import { MESSAGES } from '../../../core/constants/messages.js';

export async function viewArticleCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT_NOT_FOUND);
  }

  if (!draft.editorial) {
    return telegramApi.sendMessage(update.chatId, 'Artikel belum tersedia.');
  }

  const article = draft.editorial.article;

  // 🔄 PARSER RESILIEN MULTILINE: Deteksi tanda #, ##, ###, atau #### lalu ubah menjadi bold di Telegram
  const cleanContent = article.content.replace(/^#{1,4}\s+(.+?)\r?$/gm, '*■ $1*');

  return telegramApi.sendMessage(
    update.chatId,
    [
      '📰 *JUDUL*',
      '',
      article.title,
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      '📝 *LEAD*',
      '',
      article.lead,
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      '📄 *ARTIKEL*',
      '',
      cleanContent,
    ].join('\n')
  );
}
