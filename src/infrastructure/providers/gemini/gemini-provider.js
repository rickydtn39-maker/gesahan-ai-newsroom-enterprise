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
    const url = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${this.apiKey}`;

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
        // 🚀 NATIVE STRUCTURED OUTPUT SCHEMA INTEGRATION
        responseMimeType: request.schema ? 'application/json' : 'text/plain',
        responseSchema: request.schema ? request.schema : undefined,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const duration = Date.now() - startTime;
      this.metrics.timing('gemini_api_latency', duration, { model: this.model });

      const payload = await response.json();

      if (!response.ok) {
        this.metrics.increment('gemini_api_errors', 1, { status: response.status });
        throw new Error(
          `Stage 1 Gemini (${response.status}): ${payload?.error?.message || 'Unknown error'}`
        );
      }

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

      const parsed = JSON.parse(cleaned);
      this.logger.info('Gemini API call completed successfully', { durationMs: duration });
      return parsed;
    } catch (error) {
      this.logger.error('Gemini API execution failed', { error: error.message });
      throw error;
    }
  }
}
