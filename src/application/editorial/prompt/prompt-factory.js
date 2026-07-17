import { EditorialBuilder } from './builders/editorial-builder.js';

export class PromptFactory {
  constructor() {
    this.editorialBuilder = new EditorialBuilder();
  }

  editorial(job) {
    return this.editorialBuilder.build(job);
  }
}
