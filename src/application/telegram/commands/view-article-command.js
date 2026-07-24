// FILE: src/application/telegram/commands/view-article-command.js

import { MESSAGES } from '../../../core/constants/messages.js';

function escapeMarkdown(text) {
  if (!text) return '';
  return text.toString().replace(/[_*`[\]]/g, '\\$&');
}

export async function viewArticleCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.NOT_FOUND);
  }

  if (!draft.editorial) {
    return telegramApi.sendMessage(update.chatId, 'Artikel belum tersedia.');
  }

  // 🚀 PROTEKSI CRITICAL: Mengamankan properti article dari kegagalan state null
  const article = draft.editorial?.article ?? { title: 'Tanpa Judul', lead: '', content: '' };

  // 🚀 LANGKAH PENGAMANAN SANGAT KETAT: Escape karakter Markdown bawaan teks rilis,
  // baru kemudian ubah headings Markdown (#) menjadi Bold khusus di Telegram (*■ Heading*)
  const cleanContent = escapeMarkdown(article.content || '').replace(
    /^#{1,4}\s+(.+?)\r?$/gm,
    '*■ $1*'
  );

  return telegramApi.sendMessage(
    update.chatId,
    [
      '📰 *JUDUL*',
      '',
      escapeMarkdown(article.title || 'Tanpa Judul'),
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      '📝 *LEAD*',
      '',
      escapeMarkdown(article.lead || ''),
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      '📄 *ARTIKEL*',
      '',
      cleanContent,
    ].join('\n')
  );
}
