import { createLogger } from '../logger/index.js';

import { Container } from './container.js';
import { TOKENS } from './tokens.js';

export function createContainer(configuration) {
  const container = new Container();

  container.registerInstance(
    TOKENS.CONFIGURATION,
    configuration
  );

  container.registerFactory(TOKENS.LOGGER, () => {
    return createLogger();
  });

  return container;
}