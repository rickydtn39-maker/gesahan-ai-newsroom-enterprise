// FILE: src/application/editorial/editorial-engine.js

import { createEditorialJob } from './dto/editorial-job.js';
import { EditorialPromptBuilder } from './prompt/editorial-prompt-builder.js';
import {
  GEMINI_INGEST_SCHEMA,
  GEMINI_EDITORIAL_SCHEMA,
} from './schema/editorial-response-schema.js';

export class EditorialEngine {
  constructor(aiProvider, openaiProvider) {
    this.aiProvider = aiProvider;
    this.openaiProvider = openaiProvider; // Berisi instansi GeminiProvider kedua (Stage 2)
    this.promptBuilder = new EditorialPromptBuilder();
  }

  async processStage1(draft, reporterContext) {
    const job = createEditorialJob(draft);
    const geminiPrompt = this.promptBuilder.buildGeminiPass(job, reporterContext);

    return this.aiProvider.generate({
      prompt: geminiPrompt,
      schema: GEMINI_INGEST_SCHEMA,
    });
  }

  // Tetap pertahankan nama method processStage3 untuk backward-compatibility dengan Workflow bot Telegram
  async processStage3(draft, stage1Result, reporterContext) {
    const job = createEditorialJob(draft);
    const chatGptPrompt = this.promptBuilder.buildChatGptPass(job, stage1Result, reporterContext);

    return this.openaiProvider.generate({
      prompt: chatGptPrompt,
      schema: GEMINI_EDITORIAL_SCHEMA,
    });
  }
}
