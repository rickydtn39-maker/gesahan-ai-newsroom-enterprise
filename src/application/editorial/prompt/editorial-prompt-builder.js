import { PromptFactory } from './prompt-factory.js';

export class EditorialPromptBuilder {
  constructor() {
    this.factory = new PromptFactory();
  }

  buildGeminiPass(job) {
    return this.factory.editorialBuilder.buildGeminiPass(job);
  }

  buildChatGptPass(job, geminiResult) {
    return this.factory.editorialBuilder.buildChatGptPass(job, geminiResult);
  }
}