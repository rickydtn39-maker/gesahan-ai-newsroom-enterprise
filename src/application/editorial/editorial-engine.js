import { createEditorialJob } from './dto/editorial-job.js';
import { EditorialPromptBuilder } from './prompt/editorial-prompt-builder.js';

export class EditorialEngine {
  constructor(aiProvider) {
    this.aiProvider = aiProvider;
    this.promptBuilder = new EditorialPromptBuilder();
  }

  async process(request) {
    const job = createEditorialJob(request.draft);

    const prompt = this.promptBuilder.build(job);

    return this.aiProvider.generate({
      model: request.ai.model,
      prompt,
      schema: request.ai.schema
    });
  }
}