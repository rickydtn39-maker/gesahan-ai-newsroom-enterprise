import { AiProvider } from '../../../application/ports/ai-provider.js';

export class GeminiProvider extends AiProvider {
  constructor(apiKey, model) {
    super();

    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(request) {
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: request.prompt
              }
            ]
          }
        ]
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error?.message ??
          `Gemini request failed (${response.status})`
      );
    }

    const text =
      result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return {
      raw: result,
      text
    };
  }
}