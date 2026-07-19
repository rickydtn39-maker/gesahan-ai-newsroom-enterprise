import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { attachFeaturedImage } from '../../services/featured-image-service.js';
import { createPublishKeyboard } from '../keyboards/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';

export async function featuredImageCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.NOT_FOUND);
  }

  if (draft.state !== WORKFLOW_STATE.WAITING_FEATURED_IMAGE) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.IMAGE.WAITING_MISMATCH);
  }

  if (!update.hasPhoto) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.IMAGE.REQUIRED);
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
