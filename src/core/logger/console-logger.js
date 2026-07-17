import { Logger } from './logger.js';

export class ConsoleLogger extends Logger {
  #write(level, message, context) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    console.log(JSON.stringify(payload));
  }

  debug(message, context = {}) {
    this.#write('debug', message, context);
  }

  info(message, context = {}) {
    this.#write('info', message, context);
  }

  warn(message, context = {}) {
    this.#write('warn', message, context);
  }

  error(message, context = {}) {
    this.#write('error', message, context);
  }
}
