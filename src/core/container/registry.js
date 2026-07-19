import { createLogger } from '../logger/index.js';
import { MetricsService } from '../metrics/index.js';
import { EventBus } from '../event-bus/event-bus.js'; 

import { DraftRepository, WhitelistRepository } from '../../infrastructure/persistence/kv/index.js';

import { TelegramApi } from '../../infrastructure/providers/telegram/index.js';
import { GeminiProvider } from '../../infrastructure/providers/gemini/index.js';
import { OpenAiProvider } from '../../infrastructure/providers/openai/index.js';
import { WordPressProvider } from '../../infrastructure/providers/wordpress/index.js';
import { GeminiOcrProvider } from '../../infrastructure/providers/ocr/index.js';
import { SeoProvider } from '../../infrastructure/providers/seo/seo-provider.js';

import { SessionManager } from '../../application/session/index.js';

import {
  EditorialEngine,
  EditorialService
} from '../../application/editorial/index.js';

import { PublishingService } from '../../application/publishing/index.js';
import { registerSeoSubscriber } from '../../application/publishing/subscribers/seo-subscriber.js'; 

import { Container } from './container.js';
import { TOKENS } from './tokens.js';

export function createContainer(configuration, env, correlationId = null) {
  const container = new Container();

  container.registerInstance(TOKENS.CONFIGURATION, configuration);

  // 🚀 LOGGER OTOMATIS TER-IKAT DENGAN CORRELATION ID REQUEST
  container.registerFactory(TOKENS.LOGGER, () => createLogger(correlationId));

  container.registerFactory(
    TOKENS.METRICS,
    (c) => new MetricsService(c.resolve(TOKENS.LOGGER))
  );

  // 🚀 REGISTER EVENT BUS SINGLETON
  container.registerFactory(
    TOKENS.EVENT_BUS,
    (c) => new EventBus(c.resolve(TOKENS.LOGGER))
  );

  container.registerFactory(
    TOKENS.DRAFT_REPOSITORY,
    () => new DraftRepository(env.GESAHAN_DRAFTS)
  );

  container.registerFactory(
    TOKENS.WHITELIST_REPOSITORY,
    () => new WhitelistRepository(env.GESAHAN_DRAFTS)
  );

  container.registerFactory(
    TOKENS.SESSION_MANAGER,
    (c) => new SessionManager(c.resolve(TOKENS.DRAFT_REPOSITORY))
  );

  container.registerFactory(
    TOKENS.AI_PROVIDER,
    (c) =>
      new GeminiProvider(
        configuration.gemini.apiKey,
        configuration.gemini.model,
        c.resolve(TOKENS.LOGGER),
        c.resolve(TOKENS.METRICS)
      )
  );

  container.registerFactory(
    TOKENS.OPENAI_PROVIDER,
    (c) =>
      new OpenAiProvider(
        configuration.openai.apiKey,
        configuration.openai.model,
        c.resolve(TOKENS.LOGGER),
        c.resolve(TOKENS.METRICS)
      )
  );

  container.registerFactory(
    TOKENS.OCR_PROVIDER,
    () =>
      new GeminiOcrProvider(
        configuration.gemini.apiKey,
        configuration.gemini.model
      )
  );

  container.registerFactory(
    TOKENS.SEO_PROVIDER,
    (c) => new SeoProvider(configuration, c.resolve(TOKENS.LOGGER))
  );

  container.registerFactory(
    TOKENS.EDITORIAL_ENGINE,
    (c) =>
      new EditorialEngine(
        c.resolve(TOKENS.AI_PROVIDER),
        c.resolve(TOKENS.OPENAI_PROVIDER)
      )
  );

  container.registerFactory(
    TOKENS.EDITORIAL_SERVICE,
    (c) =>
      new EditorialService(
        c.resolve(TOKENS.EDITORIAL_ENGINE),
        c.resolve(TOKENS.LOGGER),
        c.resolve(TOKENS.METRICS)
      )
  );

  container.registerFactory(
    TOKENS.TELEGRAM_API,
    () => new TelegramApi(configuration.telegram.botToken)
  );

  container.registerFactory(
    TOKENS.WORDPRESS_PROVIDER,
    () => new WordPressProvider(configuration)
  );

  container.registerFactory(
    TOKENS.PUBLISHING_SERVICE,
    (c) =>
      new PublishingService(
        c.resolve(TOKENS.TELEGRAM_API),
        c.resolve(TOKENS.WORDPRESS_PROVIDER),
        c.resolve(TOKENS.WHITELIST_REPOSITORY),
        c.resolve(TOKENS.EVENT_BUS), // Inject Decoupled Event Bus
        c.resolve(TOKENS.LOGGER),
        c.resolve(TOKENS.METRICS)
      )
  );

  // 🚀 INITIALIZE SUBSCRIBERS / PLUGINS BOOTSTRAPPER
  registerSeoSubscriber(container);

  return container;
}