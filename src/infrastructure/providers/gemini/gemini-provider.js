// FILE: src/infrastructure/providers/gemini/gemini-provider.js

import { AiProvider } from '../../../application/ports/ai-provider.js';

export class GeminiProvider extends AiProvider {
  constructor(apiKey, model, logger, metrics) {
    super();
    this.apiKey = apiKey;
    this.model = (model || 'gemini-2.5-flash').toLowerCase();
    this.logger = logger;
    this.metrics = metrics;
  }

  async generate(request) {
    const startTime = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    this.logger.info('Executing Gemini API call', { model: this.model });

    const body = {
      contents: [
        {
          parts: [
            {
              text: request.prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: request.schema ? 'application/json' : 'text/plain',
        responseSchema: request.schema ? request.schema : undefined,
      },
    };

    // 🚀 FAIL-FAST SHIELD: Mengunci maksimal 3 kali percobaan untuk mencegah Worker timeout
    const maxRetries = 3;
    let delay = 1000;
    let response;
    let payload;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        payload = await response.json();

        if (response.ok) {
          break;
        }

        const status = response.status;

        if (status === 429 || status >= 500) {
          if (attempt === maxRetries) {
            this.metrics.increment('gemini_api_errors', 1, { status: String(status) });
            throw new Error(
              `Stage 1 Gemini (${status}): ${payload?.error?.message || 'Exceeded max retry limits'}`
            );
          }

          const jitter = Math.random() * 500;
          const sleepTime = delay + jitter;

          this.logger.warn(
            `[Gemini Rate Limit Shield] Received HTTP ${status}. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(sleepTime)}ms...`,
            { model: this.model }
          );

          this.metrics.increment('gemini_api_retry', 1, {
            status: String(status),
            attempt: String(attempt),
          });

          await new Promise((resolve) => setTimeout(resolve, sleepTime));
          delay *= 2;
          continue;
        }

        this.metrics.increment('gemini_api_errors', 1, { status: String(status) });
        throw new Error(
          `Gemini Client Error (${status}): ${payload?.error?.message || 'Bad Request'}`
        );
      } catch (error) {
        if (attempt === maxRetries) {
          this.logger.error('Gemini API execution failed after maximum retries', {
            error: error.message,
          });
          throw error;
        }

        const jitter = Math.random() * 500;
        const sleepTime = delay + jitter;
        this.logger.warn(
          `[Gemini Connection Shield] Connection error: ${error.message}. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(sleepTime)}ms...`
        );

        await new Promise((resolve) => setTimeout(resolve, sleepTime));
        delay *= 2;
      }
    }

    const duration = Date.now() - startTime;
    this.metrics.timing('gemini_api_latency', duration, { model: this.model });

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      this.metrics.increment('gemini_api_errors', 1, { error_type: 'empty_response' });
      throw new Error('Gemini tidak mengembalikan output.');
    }

    const cleaned = text
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      this.logger.info('Gemini API call completed successfully', { durationMs: duration });
      return parsed;
    } catch (parseError) {
      this.logger.error('Failed to parse Gemini output as JSON', { rawText: cleaned });
      throw new Error('Gemini response returned invalid JSON format', { cause: parseError });
    }
  }
}