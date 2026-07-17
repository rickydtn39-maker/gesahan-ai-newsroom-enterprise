import { ConsoleLogger } from './console-logger.js';

export function createLogger() {
  return new ConsoleLogger();
}