import {
  CONTENT_TYPE,
  HTTP_STATUS
} from '../../core/constants/index.js';

import { TOKENS } from '../../core/container/index.js';

import { createTelegramUpdate } from '../../application/dto/telegram-update.js';
import { dispatchTelegramUpdate } from '../../application/telegram/index.js';

export async function telegramWebhookHandler(request, context) {
  const payload = await request.json();
  const update = createTelegramUpdate(payload);

  const telegramApi = context.container.resolve(TOKENS.TELEGRAM_API);
  const sessionManager = context.container.resolve(TOKENS.SESSION_MANAGER);

  await dispatchTelegramUpdate(update, {
    telegramApi,
    sessionManager,
    context // Kita teruskan context agar command bisa resolve service lain
  });

  return new Response(
    JSON.stringify({ ok: true }, null, 2),
    {
      status: HTTP_STATUS.OK,
      headers: {
        'content-type': CONTENT_TYPE.JSON
      }
    }
  );
}