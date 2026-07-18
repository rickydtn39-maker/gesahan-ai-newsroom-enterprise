export class OpenAiProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4o';
  }

  async generate(request) {
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
        temperature: 0.3,
        response_format: request.schema ? { type: 'json_object' } : undefined
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const msg = payload?.error?.message || `HTTP ${response.status}`;
      throw new Error(`GitHub Models error (${response.status}): ${msg}`);
    }

    const content = payload?.choices?.[0]?.message?.content ?? '';
    
    // Fungsi utilitas untuk membersihkan markdown backticks jika tidak sengaja dihasilkan oleh LLM
    const cleanContent = content
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(cleanContent);
    } catch (error) {
      throw new Error('Gagal mengurai format JSON dari GitHub Models.', { cause: error });
    }
  }
}