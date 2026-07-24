import { createEditorialJob } from './dto/editorial-job.js';
import { EditorialPromptBuilder } from './prompt/editorial-prompt-builder.js';
import { GEMINI_INGEST_SCHEMA } from './schema/editorial-response-schema.js';

export class EditorialEngine {
  constructor(aiProvider, openaiProvider) {
    this.aiProvider = aiProvider;
    this.openaiProvider = openaiProvider;
    this.promptBuilder = new EditorialPromptBuilder();
  }

  async processStage1(draft) {
    const job = createEditorialJob(draft);
    const geminiPrompt = this.promptBuilder.buildGeminiPass(job);

    return this.aiProvider.generate({
      prompt: geminiPrompt,
      schema: GEMINI_INGEST_SCHEMA,
    });
  }

  async processStage3(draft, stage1Result) {
    const job = createEditorialJob(draft);
    const chatGptPrompt = this.promptBuilder.buildChatGptPass(job, stage1Result);

    return this.openaiProvider.generate({
      prompt: chatGptPrompt,
      schema: true,
    });
  }
}
