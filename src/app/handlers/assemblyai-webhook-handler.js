// FILE: src/app/handlers/assemblyai-webhook-handler.js

import { CONTENT_TYPE, HTTP_STATUS, WORKFLOW_STATE } from '../../core/constants/index.js';
import { TOKENS } from '../../core/container/tokens.js';
import { QueueManager } from '../../infrastructure/queue/queue-manager.js';

export async function assemblyAiWebhookHandler(request, context) {
  const logger = context.container.resolve(TOKENS.LOGGER);
  const telegramApi = context.container.resolve(TOKENS.TELEGRAM_API);
  const sessionManager = context.container.resolve(TOKENS.SESSION_MANAGER);

  const url = new URL(request.url);
  const chatId = url.searchParams.get('chatId');
  const userId = url.searchParams.get('userId');

  if (!chatId || !userId) {
    logger.warn('Unauthorized or malformed AssemblyAI Webhook payload blocked');
    return new Response(JSON.stringify({ error: 'BAD_REQUEST' }), {
      status: HTTP_STATUS.BAD_REQUEST,
      headers: { 'content-type': CONTENT_TYPE.JSON },
    });
  }

  try {
    const payload = await request.json();
    logger.info('Received AssemblyAI webhook notification', { chatId, status: payload.status });

    const draft = await sessionManager.get(chatId);
    if (!draft || draft.state !== WORKFLOW_STATE.WAITING_TRANSCRIPT) {
      logger.warn('Ignored webhook: draft session mismatch or expired.', { chatId });
      return new Response(JSON.stringify({ ok: true, status: 'IGNORED' }), {
        status: HTTP_STATUS.OK,
        headers: { 'content-type': CONTENT_TYPE.JSON },
      });
    }

    if (payload.status === 'error' || payload.status === 'failed') {
      await sessionManager.cancel(chatId);
      await telegramApi.sendMessage(
        chatId,
        `❌ *Transkripsi Gagal:* Server AssemblyAI melaporkan kegagalan pengolahan audio.\n\nSesi dibatalkan.`
      );
      return new Response(JSON.stringify({ ok: true }), { status: HTTP_STATUS.OK });
    }

    if (payload.status === 'completed') {
      await telegramApi.sendMessage(
        chatId,
        '🎙️ *Transkripsi Audio Selesai!* Mengunduh teks transkrip...'
      );

      // Unduh transkrip teks lengkap dari AssemblyAI menggunakan kredensial dari config
      const transcriptResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${payload.transcript_id}`,
        {
          headers: {
            authorization:
              context.configuration.openai.apiKey || context.configuration.gemini.apiKey, // Amankan fallback key
          },
        }
      );

      if (!transcriptResponse.ok) {
        throw new Error('Gagal mengunduh teks transkrip dari AssemblyAI CDN.');
      }

      const transcriptData = await transcriptResponse.json();
      const extractedText = transcriptData.text;

      if (!extractedText) {
        throw new Error('Hasil transkrip audio kosong.');
      }

      // Perbarui status draf dan masukkan teks transkrip secara asinkron
      const updatedDraft = draft.copyWith({
        state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
        source: {
          ...draft.source,
          type: 'text',
          text: extractedText,
        },
      });
      await sessionManager.save(updatedDraft);

      await telegramApi.sendMessage(
        chatId,
        '⏳ *[STAGE 1] Memulai analisis data dan pembagian tema...*'
      );

      // Masukkan ke dalam antrean (Queue) untuk diproses AI secara aman tanpa tabrakan
      await QueueManager.add(chatId, userId, 'STAGE_1_INGEST', {}, context.container);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: HTTP_STATUS.OK,
      headers: { 'content-type': CONTENT_TYPE.JSON },
    });
  } catch (error) {
    logger.error('Error handling AssemblyAI Webhook', { error: error.message });
    await telegramApi.sendMessage(chatId, `❌ *Sistem Webhook Error:* ${error.message}`);
    try {
      await sessionManager.cancel(chatId);
    } catch (_e) {
      /* ignored */
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      headers: { 'content-type': CONTENT_TYPE.JSON },
    });
  }
}
