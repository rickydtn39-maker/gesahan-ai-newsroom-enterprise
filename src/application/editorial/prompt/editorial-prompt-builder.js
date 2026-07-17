import { PromptFactory } from './prompt-factory.js';

export class EditorialPromptBuilder {
  constructor() {
    this.factory = new PromptFactory();
  }

  build(job) {
    return this.factory.editorial(job);
  }
}
