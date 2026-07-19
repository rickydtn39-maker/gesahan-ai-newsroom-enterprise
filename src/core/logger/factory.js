import { ConsoleLogger } from './console-logger.js';

export function createLogger(correlationId = null) {
  return new ConsoleLogger(correlationId);
}