import { TOKENS } from '../../../core/container/index.js';
import { attachPublishedResult } from '../../services/published-draft-service.js';

export async function publishNowCommand(
  update,
  telegramApi,
  sessionManager,
  container
) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(
      update.chatId,
      'Draft tidak ditemukan.'
    );
  }

  try {
    const publishingService = container.resolve(
      TOKENS.PUBLISHING_SERVICE
    );

    const published =
      await publishingService.publish(draft);

    const completedDraft =
      attachPublishedResult(
        draft,
        published
      );

    await sessionManager.save(completedDraft);

    return telegramApi.sendMessage(
      update.chatId,
      [
        '✅ Artikel berhasil dipublikasikan.',
        '',
        `📰 ${draft.editorial.article.title}`,
        '',
        `🔗 ${published.url}`,
        '',
        `🆔 WordPress ID : ${published.id}`,
        '',
        'Terima kasih.'
      ].join('\n')
    );
  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      [
        '❌ Publish gagal.',
        '',
        error.message
      ].join('\n')
    );
  }
}