// FILE: src/application/editorial/prompt/editorial-prompt-builder.js

import { EditorialBuilder } from './builders/editorial-builder.js';

export class EditorialPromptBuilder {
  constructor() {
    this.editorialBuilder = new EditorialBuilder();
  }

  buildGeminiPass(job, reporterContext = { name: 'Wartawan', isPolresPagaralam: false }) {
    return this.editorialBuilder.buildGeminiPass(job, reporterContext);
  }

  buildChatGptPass(job, geminiResult, reporterContext = { name: 'Wartawan', isPolresPagaralam: false }) {
    return this.editorialBuilder.buildChatGptPass(job, geminiResult, reporterContext);
  }
}