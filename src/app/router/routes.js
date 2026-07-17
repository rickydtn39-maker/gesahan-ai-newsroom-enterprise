import { healthHandler } from '../handlers/health-handler.js';
import { rootHandler } from '../handlers/root-handler.js';
import { telegramWebhookHandler } from '../handlers/telegram-webhook-handler.js';

export function registerRoutes(router) {
  router
    .register('GET', '/', rootHandler)
    .register('GET', '/health', healthHandler)
    .register('POST', '/webhooks/telegram', telegramWebhookHandler);

  return router;
}
