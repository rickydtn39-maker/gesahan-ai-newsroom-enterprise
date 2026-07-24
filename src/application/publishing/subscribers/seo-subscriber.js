// FILE: src/application/publishing/subscribers/seo-subscriber.js

import { TOKENS } from '../../../core/container/tokens.js';

export function registerSeoSubscriber(container) {
  const eventBus = container.resolve(TOKENS.EVENT_BUS);
  const seoProvider = container.resolve(TOKENS.SEO_PROVIDER);
  const seoIntelligence = container.resolve(TOKENS.SEO_INTELLIGENCE);
  const logger = container.resolve(TOKENS.LOGGER);

  // 🚀 LISTEN TO 'ARTICLE_PUBLISHED' EVENT
  eventBus.subscribe('ARTICLE_PUBLISHED', async (eventData) => {
    const { articleUrl } = eventData;
    logger.info('Event ARTICLE_PUBLISHED received. Initiating subscriber tasks', { articleUrl });

    // 1. Jalankan Traditional Pings (Sitemap Bing & WebSub Google) secara instan
    try {
      await Promise.all([seoProvider.pingSitemap(), seoProvider.pingRssFeed()]);
      logger.info('Traditional Search Engine XML Pings broadcast completed');
    } catch (pingError) {
      logger.error('XML Sitemap/RSS Ping Broadcast experienced minor failures', {
        error: pingError.message,
      });
    }

    // =========================================================================
    // 🚀 BACKGROUND TASK SHIELDING (NON-BLOCKING)
    // Jalankan audit SEO di latar belakang tanpa menahan pesan Telegram Utama.
    // Gunakan ctx.waitUntil agar Cloudflare tidak mematikan proses di tengah jalan.
    // =========================================================================
    const ctx = container.has('ctx') ? container.resolve('ctx') : null;
    const auditPromise = seoIntelligence.run(eventData);

    if (ctx && typeof ctx.waitUntil === 'function') {
      logger.info('SEO Suite audit registered under Cloudflare background execution shield');
      ctx.waitUntil(auditPromise);
    } else {
      logger.warn('Cloudflare context is absent. Executing audit without system shielding');
      auditPromise.catch((auditError) => {
        logger.error('Background SEO Intelligence Suite execution failed', {
          error: auditError.message,
        });
      });
    }
  });
}
