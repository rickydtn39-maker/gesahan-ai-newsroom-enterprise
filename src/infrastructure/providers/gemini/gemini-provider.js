import { AiProvider } from '../../../application/ports/ai-provider.js';

export class GeminiProvider extends AiProvider {
  constructor(apiKey, model) {
    super();
    this.apiKey = apiKey;
    // Default menggunakan Gemini-2.5-Pro jika tidak ada konfigurasi di wrangler
    this.model = model || 'Gemini-2.5-Pro';
  }

  async generate(request) {
    // Reroute ke endpoint stabil GitHub Models
    const url = 'https://models.inference.ai.azure.com/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        temperature: 0.2,
        response_format: request.schema ? { type: 'json_object' } : undefined
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const msg = payload?.error?.message || `HTTP ${response.status}`;
      throw new Error(`Stage 1 Gemini (GitHub Models) error (${response.status}): ${msg}`);
    }

    const content = payload?.choices?.[0]?.message?.content ?? '';
    
    const cleanContent = content
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(cleanContent);
    } catch (error) {
      throw new Error('Gagal mengurai format JSON dari Ingest Engine.', { cause: error });
    }
  }
}