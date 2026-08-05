// FILE: src/app/router/routes.js

import { healthHandler } from '../handlers/health-handler.js';
import { rootHandler } from '../handlers/root-handler.js';
import { telegramWebhookHandler } from '../handlers/telegram-webhook-handler.js';
import { setupHandler } from '../handlers/setup-handler.js';

export function registerRoutes(router) {
  router
    .register('GET', '/', rootHandler)
    .register('GET', '/health', healthHandler)
    .register('GET', '/setup', setupHandler)
    .register('POST', '/webhooks/telegram', telegramWebhookHandler);

  return router;
}
