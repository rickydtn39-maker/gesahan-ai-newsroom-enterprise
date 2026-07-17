import { createLogger } from '../logger/index.js';

import { DraftRepository } from '../../infrastructure/persistence/kv/index.js';

import { Container } from './container.js';
import { TOKENS } from './tokens.js';

export function createContainer(configuration, env) {
  const container = new Container();

  container.registerInstance(
    TOKENS.CONFIGURATION,
    configuration
  );

  container.registerFactory(TOKENS.LOGGER, () => {
    return createLogger();
  });

  container.registerFactory(
    TOKENS.DRAFT_REPOSITORY,
    () => {
      return new DraftRepository(
        env.GESAHAN_DRAFTS
      );
    }
  );

  return container;
}