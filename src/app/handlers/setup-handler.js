import { CONTENT_TYPE, HTTP_STATUS } from '../../core/constants/index.js';
import { TOKENS } from '../../core/container/tokens.js';

export async function setupHandler(request, context) {
  const config = context.configuration;
  const telegramApi = context.container.resolve(TOKENS.TELEGRAM_API);
  const logger = context.container.resolve(TOKENS.LOGGER);

  const url = new URL(request.url);
  const webhookUrl = `${url.origin}/webhooks/telegram`;
  
  logger.info('Running automatic Telegram Webhook sync setup...', { webhookUrl });

  try {
    if (!config.telegram.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured in environment.');
    }

    // Panggil Telegram API setWebhook dengan payload resmi
    const result = await fetch(`${telegramApi.baseUrl}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: config.telegram.webhookSecretToken || undefined,
        allowed_updates: ['message', 'edited_message', 'callback_query']
      })
    });

    const payload = await result.json();

    if (!result.ok || !payload.ok) {
      throw new Error(payload.description || `HTTP ${result.status}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Telegram Webhook and Security Secret Token successfully configured and synced!',
        webhookUrl,
        securityTokenActive: Boolean(config.telegram.webhookSecretToken),
        telegramResponse: payload
      }, null, 2),
      {
        status: HTTP_STATUS.OK,
        headers: {
          'content-type': CONTENT_TYPE.JSON
        }
      }
    );
  } catch (error) {
    logger.error('Telegram Webhook setup registration failed', { error: error.message });
    return new Response(
      JSON.stringify({
        success: false,
        error: 'WEBHOOK_SETUP_FAILED',
        message: error.message
      }, null, 2),
      {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        headers: {
          'content-type': CONTENT_TYPE.JSON
        }
      }
    );
  }
}