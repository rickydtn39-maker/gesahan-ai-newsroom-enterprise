import { EditorialResult } from './models/index.js';
import { EditorialValidator } from './validator/index.js';

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export class EditorialService {
  constructor(editorialEngine, logger, metrics) {
    this.editorialEngine = editorialEngine;
    this.validator = new EditorialValidator();
    this.logger = logger;
    this.metrics = metrics;
  }

  async ingestStage1(draft) {
    const startTime = Date.now();
    this.logger.info('Stage 1 Ingest Engine starting', { chatId: draft.chatId });

    try {
      const rawResult = await this.editorialEngine.processStage1(draft);
      const validated = this.validator.validateIngest(rawResult);

      this.metrics.timing('stage1_duration', Date.now() - startTime);
      return validated;
    } catch (error) {
      this.logger.error('Stage 1 Ingest Engine failed', { error: error.message });
      throw error;
    }
  }

  async generate(draft, stage1Result) {
    const startTime = Date.now();
    this.logger.info('Stage 3 Editorial Engine starting', { draftId: draft.id });

    try {
      const rawResult = await this.editorialEngine.processStage3(draft, stage1Result);
      const validated = this.validator.validateEditorial(rawResult);

      const fullText = `${validated.lead}\n\n${validated.content}`;
      const wordCount = fullText.split(/\s+/).filter(Boolean).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));
      const slug = slugify(validated.title);

      const finalResult = new EditorialResult({
        article: {
          title: validated.title,
          lead: validated.lead,
          content: validated.content,
        },
        seo: {
          focusKeyword: stage1Result.seo.focusKeyword,
          metaDescription: stage1Result.seo.metaDescription,
          category: stage1Result.wordpress.category,
          tags: stage1Result.wordpress.tags,
          slug,
        },
        statistics: {
          wordCount,
          readingTime,
        },
        quality: {
          score: stage1Result.newsValue.score,
          notes: validated.qcReport.notes,
        },
      });

      this.metrics.timing('stage3_duration', Date.now() - startTime);
      this.metrics.increment('articles_composed', 1);

      return finalResult;
    } catch (error) {
      this.logger.error('Stage 3 Editorial Engine failed', { error: error.message });
      throw error;
    }
  }
}
