import { EditorialResult } from './models/index.js';
import { EDITORIAL_RESPONSE_SCHEMA } from './schema/editorial-response-schema.js';
import { EditorialValidator } from './validator/index.js';

export class EditorialService {
  constructor(editorialEngine, logger, metrics) {
    this.editorialEngine = editorialEngine;
    this.validator = new EditorialValidator();
    this.logger = logger;
    this.metrics = metrics;
  }

  async generate(draft) {
    const startTime = Date.now();
    this.logger.info('Starting Editorial Engine generation', { draftId: draft.id });

    try {
      const result = await this.editorialEngine.process({
        draft,
        ai: {
          model: 'gemini-2.5-flash',
          schema: EDITORIAL_RESPONSE_SCHEMA,
        },
      });

      const validatedResult = new EditorialResult(this.validator.validate(result));

      const duration = Date.now() - startTime;
      this.logger.info('Editorial Engine generation completed', {
        draftId: draft.id,
        durationMs: duration,
      });
      this.metrics.timing('ai_generation_duration', duration, { status: 'success' });
      this.metrics.increment('articles_generated', 1);

      return validatedResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Editorial Engine generation failed', {
        draftId: draft.id,
        error: error.message,
      });
      this.metrics.timing('ai_generation_duration', duration, { status: 'error' });
      this.metrics.increment('ai_generation_errors', 1);
      throw error;
    }
  }
}
