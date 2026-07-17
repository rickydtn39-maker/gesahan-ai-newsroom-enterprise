import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { attachFeaturedImage } from '../../services/featured-image-service.js';
import { createPublishKeyboard } from '../keyboards/index.js';

export async function featuredImageCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, 'Draft tidak ditemukan.');
  }

  if (draft.state !== WORKFLOW_STATE.WAITING_FEATURED_IMAGE) {
    return telegramApi.sendMessage(
      update.chatId,
      'Saat ini sistem tidak sedang menunggu foto unggulan.'
    );
  }

  if (!update.hasPhoto) {
    return telegramApi.sendMessage(update.chatId, 'Silakan kirim foto.');
  }

  const updatedDraft = attachFeaturedImage(draft, update.photo);

  await sessionManager.save(updatedDraft);

  return telegramApi.sendMessage(
    update.chatId,
    [
      '✅ Semua data sudah lengkap.',
      '',
      'Silakan lakukan pemeriksaan terakhir.',
      '',
      `📰 ${updatedDraft.editorial.article.title}`,
      '',
      `🏷️ ${updatedDraft.editorial.seo.category}`,
      '',
      'Jika sudah sesuai tekan 🚀 Publish Sekarang.',
    ].join('\n'),
    createPublishKeyboard()
  );
}
