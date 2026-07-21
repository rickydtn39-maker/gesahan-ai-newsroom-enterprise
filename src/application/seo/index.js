// FILE: src/application/seo/index.js

import { SeoIndexMonitor } from './monitor.js';
import { SeoValidator } from './validator.js';
import { SeoScoring } from './scoring.js';
import { IndexNowService } from './indexnow.js';
import { SeoAnalyticsLogger } from './logger.js';
import { SeoTelegramReporter } from './report.js';

export class SeoIntelligenceSuite {
  constructor(logger, config, kvNamespace, d1Database, telegramApi) {
    this.logger = logger;
    this.config = config;
    
    // Inisialisasi Service Modular Internal
    this.monitor = new SeoIndexMonitor(logger, config.seo.sitemapUrl);
    this.validator = new SeoValidator();
    this.scoring = new SeoScoring();
    this.indexNow = new IndexNowService(logger, config.seo.indexNowKey, config.seo.sitemapUrl);
    this.analyticsLogger = new SeoAnalyticsLogger(logger, kvNamespace, d1Database);
    this.reporter = new SeoTelegramReporter(telegramApi);
  }

  async run(eventData) {
    const { articleUrl, postId, draftId, editorial } = eventData;
    const chatId = editorial.chatId || eventData.chatId;

    this.logger.info('SEO Intelligence Suite v1.0 activated', { postId, articleUrl });

    try {
      // 1. Submit ke IndexNow (Stage 6)
      const indexNowResponse = await this.indexNow.submit(articleUrl);
      const indexNowSuccess = indexNowResponse.success;

      // =========================================================================
      // 🚀 JEDA RITMIK REDAKSI (4 DETIK)
      // Memberikan waktu bagi server WordPress untuk stabil, flushes object cache,
      // dan memastikan notifikasi Telegram Sukses Terbit mendarat terlebih dahulu.
      // =========================================================================
      await new Promise((resolve) => setTimeout(resolve, 4000));
      
      // 2. Mulai Audit Monitor (Stage 6)
      const auditResult = await this.monitor.audit(articleUrl);

      // 3. Validasi SEO Kepatuhan (Stage 6)
      const validation = this.validator.validate(auditResult, articleUrl);

      // 4. Kalkulasi Skor & Kesehatan (Stage 6)
      const scoring = this.scoring.calculate(auditResult, indexNowSuccess, validation);

      // 5. Simpan Hasil Monitoring ke Logger Database (Stage 7)
      const reportPayload = {
        articleId: draftId,
        wpPostId: postId,
        url: articleUrl,
        publishedAt: new Date().toISOString(),
        httpStatus: auditResult.httpStatus,
        sitemapPresent: auditResult.sitemapPresent,
        canonicalValid: validation.validations.canonical,
        metaDescValid: validation.validations.metaDescLength,
        schemaPresent: auditResult.hasNewsArticle,
        robots: auditResult.robots || 'index,follow',
        ogPresent: validation.validations.hasOpenGraph,
        featuredImage: auditResult.featuredImage,
        altTagsValid: validation.validations.altTagsValid,
        wordCount: auditResult.wordCount,
        readingTime: auditResult.readingTime,
        internalLinks: auditResult.internalLinksCount,
        externalLinks: auditResult.externalLinksCount,
        indexNowStatus: indexNowResponse.status,
        seoScore: scoring.score
      };
      await this.analyticsLogger.saveReport(reportPayload);

      // 6. Kirim Laporan ke Telegram Chat Pribadi Wartawan (Telegram Report)
      if (chatId) {
        await this.reporter.send(chatId, auditResult, validation, scoring, indexNowResponse, articleUrl);
      }

      // 7. Broadcast: Kirim Salinan Laporan ke Grup Redaksi (Jika terpasang di wrangler.jsonc)
      if (this.config.telegram.groupChatId) {
        try {
          await this.reporter.send(
            this.config.telegram.groupChatId,
            auditResult,
            validation,
            scoring,
            indexNowResponse,
            articleUrl
          );
        } catch (groupReportError) {
          this.logger.error('Failed to broadcast SEO report to Telegram Group', {
            error: groupReportError.message
          });
        }
      }

      this.logger.info('SEO Intelligence Suite completed analysis successfully', { postId, score: scoring.score });
    } catch (suiteError) {
      this.logger.error('SEO Intelligence Suite suite executed with errors', {
        error: suiteError.message,
        stack: suiteError.stack
      });
    }
  }
}