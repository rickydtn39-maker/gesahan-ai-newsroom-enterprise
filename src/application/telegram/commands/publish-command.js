import { TOKENS } from '../../../core/container/tokens.js';
import { createStartKeyboard } from '../keyboards/index.js';

export async function publishNowCommand(
  update,
  telegramApi,
  sessionManager,
  container
) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, 'Draft tidak ditemukan.');
  }

  if (!draft.source?.featuredImage) {
    return telegramApi.sendMessage(update.chatId, '❌ Foto unggulan wajib dikirim terlebih dahulu.');
  }

  await telegramApi.sendMessage(
    update.chatId,
    [
      '⏳ [STAGE 5] Editor Produksi sedang memproses...',
      '1. Mengunduh media resolusi tinggi dari Telegram',
      '2. Mempublikasikan ke WordPress',
      '3. Menyuntikkan meta Yoast SEO',
      '4. Merekam log analitik newsroom'
    ].join('\n')
  );

  const startTime = Date.now();

  try {
    const publishingService = container.resolve(TOKENS.PUBLISHING_SERVICE);
    const published = await publishingService.publish(draft);

    const totalDuration = Date.now() - new Date(draft.createdAt).getTime();

    // Sesi aktif ditutup
    await sessionManager.cancel(update.chatId);

    return telegramApi.sendMessage(
      update.chatId,
      [
        '🚀 *ARTIKEL RESMI TERBIT DI MEDIA NASIONAL!*',
        '━━━━━━━━━━━━━━━━━━',
        `📰 *Judul:* ${draft.editorial.article.title}`,
        `🏷️ *Kanal:* ${draft.editorial.seo.category}`,
        `🚨 *Priority:* ${draft.stage1.priority}`,
        `⚡ *Waktu Kerja:* ${Math.ceil(totalDuration / 1000)} detik`,
        '━━━━━━━━━━━━━━━━━━',
        '',
        `🔗 *URL Artikel:*`,
        `${published.url}`,
        '',
        `🆔 *WP Post ID:* \`${published.id}\``,
        '━━━━━━━━━━━━━━━━━━',
        'Sesi draf ini telah ditutup dengan aman. Silakan klik tombol *🏁 Mulai* di bawah ini untuk memulai kembali.'
      ].join('\n'),
      createStartKeyboard() // 🚀 WAJIB KLIK START: Menyodorkan tombol Mulai Ulang
    );

  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      `❌ Gagal mempublikasikan artikel: ${error.message}`
    );
  }
}