import { GeminiResponseNormalizer } from './parser/gemini-response-normalizer.js';

export class GeminiMapper {
  constructor() {
    this.normalizer = new GeminiResponseNormalizer();
  }

  map(text) {
    const normalized = this.normalizer.normalize(text);

    return JSON.parse(normalized);
  }
}
