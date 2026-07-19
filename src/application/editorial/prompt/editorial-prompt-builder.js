import { EditorialBuilder } from './builders/editorial-builder.js';

export class EditorialPromptBuilder {
  constructor() {
    this.editorialBuilder = new EditorialBuilder();
  }

  buildGeminiPass(job) {
    return this.editorialBuilder.buildGeminiPass(job);
  }

  buildChatGptPass(job, geminiResult) {
    return this.editorialBuilder.buildChatGptPass(job, geminiResult);
  }
}