import { AiProvider } from '../../../application/ports/ai-provider.js';

export class GeminiProvider extends AiProvider {
  constructor(apiKey, model) {
    super();
    this.apiKey = apiKey;
    // Default menggunakan gemini-1.5-pro jika tidak ada konfigurasi di wrangler
    this.model = model || 'gemini-1.5-pro';
  }

  async generate(request) {
    // Memastikan nama model selalu lowercase untuk Google API resmi
    const modelName = this.model.toLowerCase();
    
    // REST API Endpoint STABIL resmi Google AI Studio
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${this.apiKey}`;

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

    // Jika skema validasi disediakan, setel ke format JSON dengan skema dari Google
    if (request.schema) {
      body.generationConfig.responseMimeType = 'application/json';
      body.generationConfig.responseSchema = request.schema;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const payload = await response.json();

    if (!response.ok) {
      const msg = payload?.error?.message || `HTTP ${response.status}`;
      throw new Error(`Stage 1 Gemini (Google AI Studio) error (${response.status}): ${msg}`);
    }

    const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    
    const cleanContent = content
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(cleanContent);
    } catch (error) {
      throw new Error('Gagal mengurai format JSON dari Google AI Studio.', { cause: error });
    }
  }
}