import { TOKENS } from '../../../core/container/index.js';
import { attachPublishedResult } from '../../services/published-draft-service.js';

export async function publishNowCommand(update, telegramApi, sessionManager, container) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, 'Draft tidak ditemukan.');
  }

  if (!draft.source?.featuredImage) {
    return telegramApi.sendMessage(
      update.chatId,
      '❌ Foto unggulan belum dikirim. Silakan kirim foto terlebih dahulu.'
    );
  }

  // Memberi tahu pengguna bahwa proses sedang berjalan karena butuh waktu beberapa detik
  await telegramApi.sendMessage(
    update.chatId,
    [
      '⏳ Memulai proses publikasi...',
      '',
      '1. Mengunduh media resolusi tinggi',
      '2. Mengunggah ke WordPress',
      '3. Memproses Kategori & Tags',
      '4. Menerbitkan artikel',
    ].join('\n')
  );

  try {
    const publishingService = container.resolve(TOKENS.PUBLISHING_SERVICE);

    const published = await publishingService.publish(draft);

    const completedDraft = attachPublishedResult(draft, published);

    await sessionManager.save(completedDraft);

    return telegramApi.sendMessage(
      update.chatId,
      [
        '✅ ARTIKEL BERHASIL DIPUBLIKASI',
        '',
        `📰 Judul : ${draft.editorial.article.title}`,
        `🏷 Kategori : ${draft.editorial.seo.category}`,
        '',
        `🔗 URL : ${published.url}`,
        '',
        `🆔 WP ID : ${published.id}`,
      ].join('\n')
    );
  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      ['❌ Publish gagal.', '', error.message].join('\n')
    );
  }
}
