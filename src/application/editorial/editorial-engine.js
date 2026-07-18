import { createEditorialJob } from './dto/editorial-job.js';
import { EditorialPromptBuilder } from './prompt/editorial-prompt-builder.js';

export class EditorialEngine {
  constructor(aiProvider, openaiProvider) {
    this.aiProvider = aiProvider;
    this.openaiProvider = openaiProvider;
    this.promptBuilder = new EditorialPromptBuilder();
  }

  async process(request) {
    const job = createEditorialJob(request.draft);

    // FASE 1: Gemini melakukan Analisis SEO & Kategori
    const geminiPrompt = this.promptBuilder.buildGeminiPass(job);
    const geminiResult = await this.aiProvider.generate({
      model: request.ai.model,
      prompt: geminiPrompt,
      schema: request.ai.schema
    });

    // FASE 2: GPT-4o menulis Prosa Jurnalistik Premium GESAHAN
    const chatGptPrompt = this.promptBuilder.buildChatGptPass(job, geminiResult);
    const chatGptResult = await this.openaiProvider.generate({
      prompt: chatGptPrompt,
      schema: true
    });

    // Penggabungan hasil akhir secara utuh
    return {
      article: {
        title: chatGptResult.title,
        lead: chatGptResult.lead,
        content: chatGptResult.content
      },
      seo: {
        focusKeyword: geminiResult.seo.focusKeyword,
        metaDescription: geminiResult.seo.metaDescription,
        category: geminiResult.seo.category,
        tags: geminiResult.seo.tags
      }
    };
  }
}