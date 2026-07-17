import { createLogger } from '../logger/index.js';

import { DraftRepository } from '../../infrastructure/persistence/kv/index.js';
import { TelegramApi } from '../../infrastructure/providers/telegram/index.js';
import { GeminiProvider } from '../../infrastructure/providers/gemini/index.js';

import { SessionManager } from '../../application/session/index.js';
import {
  EditorialEngine,
  EditorialService
} from '../../application/editorial/index.js';

import { Container } from './container.js';
import { TOKENS } from './tokens.js';

export function createContainer(configuration, env) {
  const container = new Container();

  container.registerInstance(
    TOKENS.CONFIGURATION,
    configuration
  );

  container.registerFactory(
    TOKENS.LOGGER,
    () => createLogger()
  );

  container.registerFactory(
    TOKENS.DRAFT_REPOSITORY,
    () => new DraftRepository(env.GESAHAN_DRAFTS)
  );

  container.registerFactory(
    TOKENS.SESSION_MANAGER,
    (container) =>
      new SessionManager(
        container.resolve(TOKENS.DRAFT_REPOSITORY)
      )
  );

  container.registerFactory(
    TOKENS.AI_PROVIDER,
    () =>
      new GeminiProvider(
        configuration.gemini.apiKey,
        configuration.gemini.model
      )
  );

  container.registerFactory(
    TOKENS.EDITORIAL_ENGINE,
    () => new EditorialEngine()
  );

  container.registerFactory(
    TOKENS.EDITORIAL_SERVICE,
    (container) =>
      new EditorialService(
        container.resolve(TOKENS.EDITORIAL_ENGINE)
      )
  );

  container.registerFactory(
    TOKENS.TELEGRAM_API,
    () =>
      new TelegramApi(
        configuration.telegram.botToken
      )
  );

  return container;
}