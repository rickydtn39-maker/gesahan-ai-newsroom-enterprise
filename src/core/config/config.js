import { createEnvironment } from './environment.js';
import { loadConfiguration } from './loader.js';
import { validateConfiguration } from './validator.js';

export function createConfiguration(env) {
  const environment = createEnvironment(env);

  const configuration = loadConfiguration(environment);

  return validateConfiguration(configuration);
}
