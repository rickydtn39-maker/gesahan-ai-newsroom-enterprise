import { AiProvider } from '../../../application/ports/ai-provider.js';

export class GeminiProvider extends AiProvider {
  constructor(apiKey, model) {
    super();

    this.apiKey = apiKey;
    this.model = (model || 'gemini-2.5-flash').toLowerCase();
  }

  async generate(request) {
    const url =
      `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            {
              text: request.prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        `Stage 1 Gemini (${response.status}): ${
          payload?.error?.message || 'Unknown error'
        }`
      );
    }

    const text =
      payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      throw new Error('Gemini tidak mengembalikan output.');
    }

    const cleaned = text
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error(
        'Output Gemini bukan JSON yang valid.\n\n' + cleaned
      );
    }
  }
}