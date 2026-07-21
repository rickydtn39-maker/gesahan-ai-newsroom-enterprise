// FILE: src/application/telegram/commands/publish-now-command.js

import { TOKENS } from '../../../core/container/index.js';
import { createMainKeyboard } from '../keyboards/index.js';

export async function publishNowCommand(update, telegramApi, sessionManager, container) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, 'Draft tidak ditemukan.');
  }

  if (!draft.source?.featuredImage) {
    return telegramApi.sendMessage(
      update.chatId,
      '❌ Foto unggulan wajib dikirim terlebih dahulu.'
    );
  }

  await telegramApi.sendMessage(
    update.chatId,
    [
      '⏳ [STAGE 5] Editor Produksi sedang memproses...',
      '1. Mengunduh media resolusi tinggi dari Telegram',
      '2. Mempublikasikan ke WordPress',
      '3. Menyuntikkan meta Yoast SEO',
      '4. Merekam log analitik newsroom',
    ].join('\n')
  );

  const startTime = Date.now();

  try {
    const publishingService = container.resolve(TOKENS.PUBLISHING_SERVICE);
    const published = await publishingService.publish(draft);

    const publishDuration = Date.now() - startTime;
    const totalDuration = Date.now() - new Date(draft.createdAt).getTime();

    // =========================================================================
    // DETEKSI NAMA PENULIS SECARA DINAMIS DARI WHITELIST KV
    // =========================================================================
    let authorName = 'Super Admin';
    try {
      const whitelistRepo = container.resolve(TOKENS.WHITELIST_REPOSITORY);
      const whitelist = await whitelistRepo.getAll();
      const author = whitelist.find((u) => Number(u.userId) === Number(draft.userId));
      if (author) {
        authorName = author.name;
      }
    } catch (_err) {
      // Fallback aman jika whitelist tidak dapat dibaca
    }

    // =========================================================================
    // 📊 STAGE 6: POST-PUBLISH ANALYTICS LOG
    // =========================================================================
    const logger = container.resolve(TOKENS.LOGGER);
    const metrics = container.resolve(TOKENS.METRICS);

    const analyticsLog = {
      event: 'POST_PUBLISH_ANALYTICS',
      articleId: published.id,
      url: published.url,
      title: draft.editorial.article.title,
      focusKeyword: draft.editorial.seo.focusKeyword,
      newsScore: draft.stage1.newsValue.score,
      priority: draft.stage1.priority,
      ocrConfidence: draft.stage1.confidence.ocrAccuracy || 'N/A',
      wordCount: draft.editorial.statistics.wordCount,
      durationMs: {
        publishing: publishDuration,
        totalWorkflow: totalDuration,
      },
      publishedAt: new Date().toISOString(),
    };

    logger.info('Publishing process successfully completed.', analyticsLog);
    metrics.increment('publishing_completed', 1, { priority: draft.stage1.priority });

    // =========================================================================
    // 🧠 STAGE 7: EDITORIAL MEMORY SYSTEM
    // =========================================================================
    const draftRepo = container.resolve(TOKENS.DRAFT_REPOSITORY);

    const archivedKey = `newsroom:memory:${published.id}`;
    await draftRepo.storage.put(archivedKey, {
      id: published.id,
      title: draft.editorial.article.title,
      category: draft.editorial.seo.category,
      keyword: draft.editorial.seo.focusKeyword,
      url: published.url,
      publishedAt: new Date().toISOString(),
    });

    // Reset status sesi aktif di Telegram menjadi IDLE
    await sessionManager.cancel(update.chatId);

    // =========================================================================
    // TELEGRAM BROADCAST PAYLOAD
    // =========================================================================
    const publishReportText = [
      '🚀 *ARTIKEL RESMI TERBIT DI MEDIA NASIONAL!*',
      '━━━━━━━━━━━━━━━━━━',
      `📰 *Judul:* ${draft.editorial.article.title}`,
      `✍️ *Penulis:* ${authorName}`,
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
    ].join('\n');

    // 1. Kirim Laporan ke Wartawan (Private Chat)
    await telegramApi.sendMessage(
      update.chatId,
      `${publishReportText}\nSesi draf ini telah ditutup dengan aman. Silakan klik "📰 Berita Baru" untuk memulai kembali.`,
      createMainKeyboard()
    );

    // 2. Kirim Laporan ke Grup Redaksi (Jika terkonfigurasi)
    const config = container.resolve(TOKENS.CONFIGURATION);
    if (config.telegram.groupChatId) {
      try {
        await telegramApi.sendMessage(config.telegram.groupChatId, publishReportText);
      } catch (groupError) {
        logger.error('Failed to send publish success report to Coordination Group', { error: groupError.message });
      }
    }

  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      `❌ Gagal mempublikasikan artikel: ${error.message}`
    );
  }
}