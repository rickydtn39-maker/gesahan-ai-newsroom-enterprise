// FILE: src/application/seo/logger.js

export class SeoAnalyticsLogger {
  constructor(logger, kvNamespace, d1Database = null) {
    this.logger = logger;
    this.kvNamespace = kvNamespace;
    this.d1Database = d1Database; // Opsi untuk analisis tingkat lanjut via Cloudflare D1
  }

  async saveReport(reportPayload) {
    const key = `newsroom:seo:report:${reportPayload.wpPostId}`;
    
    try {
      // 1. Simpan di Cloudflare KV
      await this.kvNamespace.put(key, JSON.stringify({
        ...reportPayload,
        createdAt: new Date().toISOString()
      }));
      this.logger.info('SEO Report archived in KV Storage', { key });

      // 2. Simpan di Cloudflare D1 (Jika D1 SQL terikat di Environment dan tipenya valid)
      if (this.d1Database && typeof this.d1Database.prepare === 'function') {
        await this.d1Database.prepare(`
          INSERT OR REPLACE INTO seo_reports (
            article_id, wp_post_id, url, published_at, http_status, 
            sitemap, canonical, meta, schema, robots, og, 
            featured_image, alt, word_count, reading_time, 
            internal_links, external_links, indexnow_status, seo_score, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `).bind(
          reportPayload.articleId,
          reportPayload.wpPostId,
          reportPayload.url,
          reportPayload.publishedAt,
          reportPayload.httpStatus,
          reportPayload.sitemapPresent ? 1 : 0,
          reportPayload.canonicalValid ? 1 : 0,
          reportPayload.metaDescValid ? 1 : 0,
          reportPayload.schemaPresent ? 1 : 0,
          reportPayload.robots,
          reportPayload.ogPresent ? 1 : 0,
          reportPayload.featuredImage,
          reportPayload.altTagsValid ? 1 : 0,
          reportPayload.wordCount,
          reportPayload.readingTime,
          reportPayload.internalLinks,
          reportPayload.externalLinks,
          reportPayload.indexNowStatus,
          reportPayload.seoScore,
          new Date().toISOString()
        ).run();
        
        this.logger.info('SEO Report successfully inserted in Cloudflare D1 Database');
      }
    } catch (error) {
      this.logger.error('Failed to log SEO Analytics', { error: error.message });
      // Non-blocking logger: Error tidak dilempar keluar agar alur utama tetap berjalan aman.
    }
  }
}