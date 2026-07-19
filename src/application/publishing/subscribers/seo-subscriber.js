import { TOKENS } from '../../../core/container/tokens.js';

export function registerSeoSubscriber(container) {
  const eventBus = container.resolve(TOKENS.EVENT_BUS);
  const seoProvider = container.resolve(TOKENS.SEO_PROVIDER);
  const logger = container.resolve(TOKENS.LOGGER);

  // 🚀 LISTEN TO 'ARTICLE_PUBLISHED' EVENT
  eventBus.subscribe('ARTICLE_PUBLISHED', async (eventData) => {
    const { articleUrl } = eventData;
    logger.info('SEO Subscriber triggered for newly published article', { articleUrl });

    try {
      await Promise.all([
        seoProvider.submitToIndexNow(articleUrl),
        seoProvider.pingSitemap(),
        seoProvider.pingRssFeed(),
      ]);
      logger.info('SEO indexing and pings completed successfully', { articleUrl });
    } catch (error) {
      logger.error('SEO Subscriber failed to complete pings', { error: error.message });
    }
  });
}
