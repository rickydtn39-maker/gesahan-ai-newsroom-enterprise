import { EditorialBuilder } from './builders/editorial-builder.js';

export class PromptFactory {
  constructor() {
    this.editorialBuilder = new EditorialBuilder();
  }

  gemini(job) {
    return this.editorialBuilder.buildGeminiPass(job);
  }

  gpt(job, geminiResult) {
    return this.editorialBuilder.buildChatGptPass(job, geminiResult);
  }
}
