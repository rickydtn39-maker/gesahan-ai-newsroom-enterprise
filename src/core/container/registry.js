import { createLogger } from '../logger/index.js';
import { MetricsService } from '../metrics/index.js';

import { DraftRepository } from '../../infrastructure/persistence/kv/index.js';

import { TelegramApi } from '../../infrastructure/providers/telegram/index.js';
import { GeminiProvider } from '../../infrastructure/providers/gemini/index.js';
import { WordPressProvider } from '../../infrastructure/providers/wordpress/index.js';
import { GeminiOcrProvider } from '../../infrastructure/providers/ocr/index.js';

import { SessionManager } from '../../application/session/index.js';

import { EditorialEngine, EditorialService } from '../../application/editorial/index.js';

import { PublishingService } from '../../application/publishing/index.js';

import { Container } from './container.js';
import { TOKENS } from './tokens.js';

export function createContainer(configuration, env) {
  const container = new Container();

  container.registerInstance(TOKENS.CONFIGURATION, configuration);

  container.registerFactory(TOKENS.LOGGER, () => createLogger());

  container.registerFactory(TOKENS.METRICS, (c) => new MetricsService(c.resolve(TOKENS.LOGGER)));

  container.registerFactory(TOKENS.DRAFT_REPOSITORY, () => new DraftRepository(env.GESAHAN_DRAFTS));

  container.registerFactory(
    TOKENS.SESSION_MANAGER,
    (c) => new SessionManager(c.resolve(TOKENS.DRAFT_REPOSITORY))
  );

  container.registerFactory(
    TOKENS.AI_PROVIDER,
    () => new GeminiProvider(configuration.gemini.apiKey, configuration.gemini.model)
  );

  container.registerFactory(
    TOKENS.OCR_PROVIDER,
    () => new GeminiOcrProvider(configuration.gemini.apiKey, configuration.gemini.model)
  );

  container.registerFactory(
    TOKENS.EDITORIAL_ENGINE,
    (c) => new EditorialEngine(c.resolve(TOKENS.AI_PROVIDER))
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

  container.registerFactory(TOKENS.WORDPRESS_PROVIDER, () => new WordPressProvider(configuration));

  container.registerFactory(
    TOKENS.PUBLISHING_SERVICE,
    (c) =>
      new PublishingService(
        c.resolve(TOKENS.TELEGRAM_API),
        c.resolve(TOKENS.WORDPRESS_PROVIDER),
        c.resolve(TOKENS.LOGGER),
        c.resolve(TOKENS.METRICS)
      )
  );

  return container;
}
