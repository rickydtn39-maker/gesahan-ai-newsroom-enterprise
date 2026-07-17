import { EditorialResult } from './models/index.js';
import { EDITORIAL_RESPONSE_SCHEMA } from './schema/editorial-response-schema.js';
import { EditorialValidator } from './validator/index.js';

export class EditorialService {
  constructor(editorialEngine) {
    this.editorialEngine = editorialEngine;
    this.validator = new EditorialValidator();
  }

  async generate(draft) {
    const result =
      await this.editorialEngine.process({
        draft,
        ai: {
          model: 'gemini-2.5-flash',
          schema: EDITORIAL_RESPONSE_SCHEMA
        }
      });

    const validated = this.validator.validate(result);

    return new EditorialResult(validated);
  }
}