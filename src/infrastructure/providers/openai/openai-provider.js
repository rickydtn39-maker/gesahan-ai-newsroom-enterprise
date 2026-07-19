export class OpenAiProvider {
  constructor(apiKey, model, logger, metrics) {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4o';
    this.logger = logger;
    this.metrics = metrics;
  }

  async generate(request) {
    const startTime = Date.now();
    const url = 'https://models.inference.ai.azure.com/chat/completions';

    this.logger.info('Executing OpenAI/GitHub Models API call', { model: this.model });

    let response;
    try {
      response = await fetch(url, {
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
    } catch (fetchErr) {
      this.metrics.increment('openai_api_errors', 1, { error_type: 'network_failure' });
      throw new Error(`OpenAI Connection Failed: ${fetchErr.message}`, { cause: fetchErr });
    }

    const duration = Date.now() - startTime;
    this.metrics.timing('openai_api_latency', duration, { model: this.model });

    if (!response.ok) {
      this.metrics.increment('openai_api_errors', 1, { status: response.status });
      let errorDetails = '';
      try {
        const errorJson = await response.json();
        errorDetails = errorJson?.error?.message || errorJson?.message || '';
      } catch (_jsonErr) {
        try {
          errorDetails = await response.text();
        } catch (_textErr) {
          // Abaikan kegagalan jika tidak mampu membaca text response body
        }
      }
      throw new Error(`GitHub Models API Error [${response.status}]: ${errorDetails || response.statusText}`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (parseErr) {
      this.metrics.increment('openai_api_errors', 1, { error_type: 'invalid_json' });
      throw new Error('Gagal memproses parsing body response JSON dari OpenAI', { cause: parseErr });
    }

    const content = payload?.choices?.[0]?.message?.content ?? '';
    
    const cleanContent = content
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleanContent);
      this.logger.info('OpenAI API call completed successfully', { durationMs: duration });
      return parsed;
    } catch (error) {
      this.metrics.increment('openai_api_errors', 1, { error_type: 'execution_failure' });
      this.logger.error('OpenAI API execution failed', { error: error.message });
      throw new Error('Gagal mengurai format JSON dari GitHub Models.', { cause: error });
    }
  }
}