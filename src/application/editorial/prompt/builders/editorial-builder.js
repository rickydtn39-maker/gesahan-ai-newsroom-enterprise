// FILE: src/application/editorial/prompt/builders/editorial-builder.js

import { WORDPRESS_CATEGORY_MAP } from '../../../../infrastructure/providers/wordpress/category-map.js';
import { getGeminiPassTemplate } from '../templates/gemini-pass-template.js';
import { getGptPassTemplate } from '../templates/gpt-pass-template.js';
import { resolveProfile } from '../registry/prompt-registry.js';
import { PromptValidator } from '../validators/prompt-validator.js';

export class EditorialBuilder {
  buildGeminiPass(job, reporterContext) {
    const allowedCategories = Object.keys(WORDPRESS_CATEGORY_MAP).join(', ');
    const promptConfig = resolveProfile(reporterContext.type);

    // Keamanan Tingkat Enterprise: Validasi struktur data profile sebelum eksekusi AI
    PromptValidator.validateProfile(promptConfig);

    return getGeminiPassTemplate(allowedCategories, job.source.text, reporterContext, promptConfig);
  }

  buildChatGptPass(job, geminiResult, reporterContext) {
    const guide = job.engine;
    const promptConfig = resolveProfile(reporterContext.type);

    // Keamanan Tingkat Enterprise: Validasi struktur data profile sebelum eksekusi AI
    PromptValidator.validateProfile(promptConfig);

    const angleInstruction = promptConfig.gptAngleInstruction(job);
    const geminiResultJson = JSON.stringify(geminiResult, null, 2);

    return getGptPassTemplate(
      angleInstruction,
      guide,
      geminiResultJson,
      job.source.text,
      reporterContext,
      promptConfig
    );
  }
}
