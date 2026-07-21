// FILE: src/application/publishing/subscribers/seo-subscriber.js

import { TOKENS } from '../../../core/container/tokens.js';

export function registerSeoSubscriber(container) {
  const eventBus = container.resolve(TOKENS.EVENT_BUS);
  const seoProvider = container.resolve(TOKENS.SEO_PROVIDER);
  const seoIntelligence = container.resolve(TOKENS.SEO_INTELLIGENCE); // 🚀 Hubungkan Modul Baru
  const logger = container.resolve(TOKENS.LOGGER);

  // 🚀 LISTEN TO 'ARTICLE_PUBLISHED' EVENT
  eventBus.subscribe('ARTICLE_PUBLISHED', async (eventData) => {
    const { articleUrl } = eventData;
    logger.info('Event ARTICLE_PUBLISHED received. Initiating subscriber tasks', { articleUrl });

    // 1. Jalankan Traditional Pings (Bing & WebSub Google) secara Non-Blocking
    try {
      await Promise.all([
        seoProvider.pingSitemap(),
        seoProvider.pingRssFeed(),
      ]);
      logger.info('Traditional Search Engine XML Pings broadcast completed');
    } catch (pingError) {
      logger.error('XML Sitemap/RSS Ping Broadcast experienced minor failures', { error: pingError.message });
    }

    // 2. Jalankan SEO Intelligence Suite v1.0 (Stage 6 & 7 & Report) secara Non-Blocking
    // Dibungkus try/catch agar kesalahan apapun pada audit tidak menggagalkan status publish
    try {
      // Jalankan tanpa 'await' jika ingin melepasnya secara penuh (fire-and-forget), 
      // namun karena dijalankan asinkron di dalam event loop, membiarkannya berjalan asinkron di sini sudah aman.
      await seoIntelligence.run(eventData);
    } catch (auditError) {
      logger.error('Fatal internal audit suite runtime error', { error: auditError.message });
    }
  });
}