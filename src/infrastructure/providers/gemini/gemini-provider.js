import { AiProvider } from '../../../application/ports/ai-provider.js';
import { GeminiResponse } from './dto/gemini-response.js';
import { GeminiMapper } from './gemini-mapper.js';

export class GeminiProvider extends AiProvider {
  constructor(apiKey, model) {
    super();
    this.apiKey = apiKey;
    this.model = model || 'gemini-2.5-flash';
    this.mapper = new GeminiMapper();
    this.timeout = 30000;
  }

  async generate(request) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    let lastError;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: request.prompt }] }],
            generationConfig: {
              temperature: 0.2,
              topP: 0.95,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
              responseSchema: request.schema,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const payload = await response.json();

        if (!response.ok) {
          const msg = payload?.error?.message || `HTTP ${response.status}`;
          if (response.status === 429 || response.status >= 500) {
            lastError = new Error(`Gemini retryable: ${msg}`);
            if (attempt === 1) {
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }
          }
          throw new Error(`Gemini error (${response.status}): ${msg}`);
        }

        const geminiResponse = new GeminiResponse(payload);
        return this.mapper.map(geminiResponse.getText());
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          // Menambahkan cause: error agar linter bahagia
          throw new Error('Gemini timeout after 30s.', { cause: error });
        }
        throw error;
      }
    }

    throw lastError || new Error('Gemini failed after retries.');
  }
}
