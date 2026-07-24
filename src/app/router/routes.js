import { healthHandler } from '../handlers/health-handler.js';
import { rootHandler } from '../handlers/root-handler.js';
import { telegramWebhookHandler } from '../handlers/telegram-webhook-handler.js';
import { setupHandler } from '../handlers/setup-handler.js';
import { assemblyAiWebhookHandler } from '../handlers/assemblyai-webhook-handler.js'; // 🚀 Impor handler baru

export function registerRoutes(router) {
  router
    .register('GET', '/', rootHandler)
    .register('GET', '/health', healthHandler)
    .register('GET', '/setup', setupHandler)
    .register('POST', '/webhooks/telegram', telegramWebhookHandler)
    .register('POST', '/webhooks/assemblyai', assemblyAiWebhookHandler); // 🚀 Daftarkan rute webhook

  return router;
}
