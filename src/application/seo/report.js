// FILE: src/application/seo/report.js

// Helper terisolasi untuk mengamankan karakter Markdown dari crash parse Telegram API
function escapeMarkdown(text) {
  if (!text) return '';
  return text.toString().replace(/[_*`[\]]/g, '\\$&');
}

export class SeoTelegramReporter {
  constructor(telegramApi, logger = null) {
    this.telegramApi = telegramApi;
    this.logger = logger;
  }

  async send(chatId, audit, validation, scoring, indexNowResponse, articleUrl) {
    const formatStatus = (isValid) => (isValid ? '✅' : '❌');
    const formatSitemap = (isPresent) => (isPresent ? '✅ Ditemukan' : '⚠️ Warning (Not Listed)');

    const formatIndexNow = (response) => {
      if (response.success) {
        return `✅ Success (${response.status})`;
      }
      return `❌ Failed - ${response.error || 'Connection Timeout'}`;
    };

    const escapedTitle = escapeMarkdown(audit.title || 'Tidak Terdeteksi');
    const escapedMetaDescription = escapeMarkdown(audit.metaDescription || '');

    const message = [
      '📊 *SEO INDEX REPORT*',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `📰 *Judul:*`,
      `_${escapedTitle}_`,
      '',
      `🌐 *URL:*`,
      `[Klik untuk Membaca](${articleUrl})`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `HTTP : ${formatStatus(validation.validations.httpStatus)} ${audit.httpStatus}`,
      `Canonical : ${formatStatus(validation.validations.canonical)} ${validation.validations.canonical ? 'Valid' : 'Mismatch'}`,
      `Sitemap : ${formatSitemap(audit.sitemapPresent)}`,
      `Title SEO : ${formatStatus(validation.validations.titleLength)} ${audit.title.length} karakter`,
      `Meta Description : ${formatStatus(validation.validations.metaDescLength)} ${escapedMetaDescription.length} karakter`,
      `Schema : ${formatStatus(validation.validations.hasSchema)} ${audit.hasNewsArticle ? 'NewsArticle' : 'Missing'}`,
      `Breadcrumb : ${formatStatus(validation.validations.hasBreadcrumb)} ${audit.hasBreadcrumb ? 'Valid' : 'Missing'}`,
      `Featured Image : ${formatStatus(validation.validations.hasFeaturedImage)} ${audit.hasFeaturedImage ? 'Detected' : 'Missing'}`,
      `ALT Image : ${formatStatus(validation.validations.altTagsValid)} ${audit.imagesMissingAltCount === 0 ? 'Lengkap' : `Hilang ${audit.imagesMissingAltCount} foto`}`,
      `OpenGraph : ${formatStatus(validation.validations.hasOpenGraph)} ${validation.validations.hasOpenGraph ? 'Lengkap' : 'Tidak Lengkap'}`,
      `Twitter Card : ${formatStatus(validation.validations.hasTwitterCard)} ${validation.validations.hasTwitterCard ? 'Lengkap' : 'Tidak Lengkap'}`,
      `Internal Link : 🔗 ${audit.internalLinksCount}`,
      `External Link : 🌍 ${audit.externalLinksCount}`,
      `Reading Time : ⏱️ ${audit.readingTime} menit`,
      `Word Count : 📝 ${audit.wordCount} kata`,
      `IndexNow : ${formatIndexNow(indexNowResponse)}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `*SEO SCORE*`,
      `*${scoring.score} / 100*`,
      `*${scoring.health.toUpperCase()}*`,
      '',
      ...(audit.sitemapPresent
        ? ['🟢 *READY TO CRAWL*']
        : ['🟡 *PENDING CRAWL* (Waiting sitemap sync)']),
    ].join('\n');

    try {
      await this.telegramApi.sendMessage(chatId, message);
    } catch (error) {
      if (this.logger) {
        this.logger.error('Failed to dispatch SEO telegram report message', {
          error: error.message,
        });
      } else {
        console.error('Failed to dispatch SEO telegram report message', error);
      }
    }
  }
}
