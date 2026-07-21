// FILE: src/core/container/registry.js

// ... [Pertahankan import lainnya tetap utuh] ...
import { SeoProvider } from '../../infrastructure/providers/seo/seo-provider.js';
import { SeoIntelligenceSuite } from '../../application/seo/index.js'; // 🚀 IMPORT BARU

import { Container } from './container.js';
import { TOKENS } from './tokens.js';

export function createContainer(configuration, env, correlationId = null) {
  const container = new Container();

  container.registerInstance(TOKENS.CONFIGURATION, configuration);
  container.registerFactory(TOKENS.LOGGER, () => createLogger(correlationId));
  container.registerFactory(TOKENS.METRICS, (c) => new MetricsService(c.resolve(TOKENS.LOGGER)));
  container.registerFactory(TOKENS.EVENT_BUS, (c) => new EventBus(c.resolve(TOKENS.LOGGER)));
  container.registerFactory(TOKENS.DRAFT_REPOSITORY, () => new DraftRepository(env.GESAHAN_DRAFTS));
  container.registerFactory(TOKENS.WHITELIST_REPOSITORY, () => new WhitelistRepository(env.GESAHAN_DRAFTS));
  container.registerFactory(TOKENS.SESSION_MANAGER, (c) => new SessionManager(c.resolve(TOKENS.DRAFT_REPOSITORY)));
  
  container.registerFactory(TOKENS.AI_PROVIDER, (c) => new GeminiProvider(
    configuration.gemini.apiKey,
    configuration.gemini.model,
    c.resolve(TOKENS.LOGGER),
    c.resolve(TOKENS.METRICS)
  ));

  container.registerFactory(TOKENS.OPENAI_PROVIDER, (c) => new OpenAiProvider(
    configuration.openai.apiKey,
    configuration.openai.model,
    c.resolve(TOKENS.LOGGER),
    c.resolve(TOKENS.METRICS)
  ));

  container.registerFactory(TOKENS.OCR_PROVIDER, () => new GeminiOcrProvider(configuration.gemini.apiKey, configuration.gemini.model));
  container.registerFactory(TOKENS.SEO_PROVIDER, (c) => new SeoProvider(configuration, c.resolve(TOKENS.LOGGER)));
  container.registerFactory(TOKENS.EDITORIAL_ENGINE, (c) => new EditorialEngine(c.resolve(TOKENS.AI_PROVIDER), c.resolve(TOKENS.OPENAI_PROVIDER)));
  container.registerFactory(TOKENS.EDITORIAL_SERVICE, (c) => new EditorialService(c.resolve(TOKENS.EDITORIAL_ENGINE), c.resolve(TOKENS.LOGGER), c.resolve(TOKENS.METRICS)));
  container.registerFactory(TOKENS.TELEGRAM_API, () => new TelegramApi(configuration.telegram.botToken));
  container.registerFactory(TOKENS.WORDPRESS_PROVIDER, () => new WordPressProvider(configuration));

  // 🚀 REGISTRASI BARU: SEO INTELLIGENCE SUITE (Mendukung D1 SQL database opsional di env.DB)
  container.registerFactory(TOKENS.SEO_INTELLIGENCE, (c) => new SeoIntelligenceSuite(
    c.resolve(TOKENS.LOGGER),
    configuration,
    env.GESAHAN_DRAFTS, // Menyediakan KV Namespace default
    env.DB || null,     // D1 SQL Binding otomatis di-resolve apabila tersedia di environment
    c.resolve(TOKENS.TELEGRAM_API)
  ));

  container.registerFactory(TOKENS.PUBLISHING_SERVICE, (c) => new PublishingService(
    c.resolve(TOKENS.TELEGRAM_API),
    c.resolve(TOKENS.WORDPRESS_PROVIDER),
    c.resolve(TOKENS.WHITELIST_REPOSITORY),
    c.resolve(TOKENS.EVENT_BUS),
    c.resolve(TOKENS.LOGGER),
    c.resolve(TOKENS.METRICS),
    c.resolve(TOKENS.DRAFT_REPOSITORY),
    c.resolve(TOKENS.CONFIGURATION)
  ));

  registerSeoSubscriber(container);

  return container;
}