import {
  CONTENT_TYPE,
  HTTP_STATUS
} from '../../core/constants/index.js';

export async function telegramWebhookHandler(request) {
  const update = await request.json();

  return new Response(
    JSON.stringify(
      {
        success: true,
        message: 'Telegram webhook received.',
        updateId: update.update_id ?? null
      },
      null,
      2
    ),
    {
      status: HTTP_STATUS.OK,
      headers: {
        'content-type': CONTENT_TYPE.JSON
      }
    }
  );
}