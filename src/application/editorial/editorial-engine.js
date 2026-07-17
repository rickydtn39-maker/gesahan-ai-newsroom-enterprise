import { createEditorialJob } from './dto/editorial-job.js';
import { EditorialPromptBuilder } from './prompt/editorial-prompt-builder.js';

export class EditorialEngine {
  constructor() {
    this.promptBuilder =
      new EditorialPromptBuilder();
  }

  async process(request) {
    const job = createEditorialJob(
      request.draft
    );

    const prompt =
      this.promptBuilder.build(job);

    const source =
      request.draft.source.text ?? '';

    const wordCount = source
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    return {
      request: {
        model: request.ai.model,

        schema: request.ai.schema,

        prompt
      },

      title: 'Judul akan dibuat AI',

      lead: 'Lead akan dibuat AI.',

      content: source,

      slug: 'judul-akan-dibuat-ai',

      excerpt: source.substring(0, 160),

      focusKeyword: '',

      metaDescription:
        source.substring(0, 155),

      category: '',

      tags: [],

      readingTime: Math.max(
        1,
        Math.ceil(wordCount / 200)
      ),

      wordCount,

      qualityScore: 0,

      status: 'READY'
    };
  }
}