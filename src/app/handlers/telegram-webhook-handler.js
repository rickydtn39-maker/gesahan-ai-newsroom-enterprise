import { CONTENT_TYPE, HTTP_STATUS } from '../../core/constants/index.js';
import { TOKENS } from '../../core/container/tokens.js';

import { createTelegramUpdate } from '../../application/dto/telegram-update.js';
import { dispatchTelegramUpdate } from '../../application/telegram/index.js';

export async function telegramWebhookHandler(request, context) {
  const logger = context.container.resolve(TOKENS.LOGGER);
  const metrics = context.container.resolve(TOKENS.METRICS);

  // SECURE WEBHOOK VERIFICATION HEADER
  const webhookSecret = context.configuration.telegram.webhookSecretToken;
  if (webhookSecret) {
    const incomingSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (incomingSecret !== webhookSecret) {
      logger.warn('Blocked unauthorized Telegram Webhook (Secret Token mismatch)', {
        incomingSecret: incomingSecret ? 'PRESENT' : 'MISSING',
      });
      metrics.increment('webhook_auth_failures', 1, { source: 'telegram' });
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: HTTP_STATUS.UNAUTHORIZED,
        headers: { 'content-type': CONTENT_TYPE.JSON },
      });
    }
  }

  const payload = await request.json();
  const update = createTelegramUpdate(payload);

  const telegramApi = context.container.resolve(TOKENS.TELEGRAM_API);
  const sessionManager = context.container.resolve(TOKENS.SESSION_MANAGER);
  
  // 🚀 DETEKSI DOMAIN AKTIF DARI REQUEST MASUK UNTUK ASSEMBLYAI WEBHOOK
  const origin = new URL(request.url).origin;

  logger.info('Incoming Telegram Webhook', {
    updateId: update.updateId,
    chatId: update.chatId,
    userId: update.userId,
    hasText: update.hasText,
    hasPhoto: update.hasPhoto,
    hasDocument: update.hasDocument,
    origin,
  });

  metrics.increment('webhook_received', 1, { source: 'telegram' });

  await dispatchTelegramUpdate(update, {
    telegramApi,
    sessionManager,
    container: context.container,
    origin, // 🚀 Wariskan domain dinamis secara rapi
  });

  return new Response(JSON.stringify({ ok: true }, null, 2), {
    status: HTTP_STATUS.OK,
    headers: { 'content-type': CONTENT_TYPE.JSON },
  });
}