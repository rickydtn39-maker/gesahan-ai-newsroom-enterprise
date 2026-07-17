import { Container } from './container.js';
import { TOKENS } from './tokens.js';

export function createContainer(configuration) {
  const container = new Container();

  container.registerInstance(
    TOKENS.CONFIGURATION,
    configuration
  );

  return container;
}