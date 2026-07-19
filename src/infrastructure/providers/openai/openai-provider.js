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

    try {
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

      const duration = Date.now() - startTime;
      this.metrics.timing('openai_api_latency', duration, { model: this.model });

      const payload = await response.json();

      if (!response.ok) {
        this.metrics.increment('openai_api_errors', 1, { status: response.status });
        const msg = payload?.error?.message || `HTTP ${response.status}`;
        throw new Error(`GitHub Models error (${response.status}): ${msg}`);
      }

      const content = payload?.choices?.[0]?.message?.content ?? '';
      
      const cleanContent = content
        .replace(/^```json/i, '')
        .replace(/^```/i, '')
        .replace(/```$/i, '')
        .trim();

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