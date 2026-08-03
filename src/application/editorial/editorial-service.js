// FILE: src/application/editorial/editorial-service.js

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
  constructor(editorialEngine, logger, metrics, whitelistRepository) {
    this.editorialEngine = editorialEngine;
    this.validator = new EditorialValidator();
    this.logger = logger;
    this.metrics = metrics;
    this.whitelistRepository = whitelistRepository;
  }

  async getReporterContext(userId) {
    try {
      const whitelist = await this.whitelistRepository.getAll();
      const user = whitelist.find((u) => Number(u.userId) === Number(userId));

      const name = user ? user.name : `Wartawan #${userId}`;
      let type = user && user.type ? user.type : 'GENERAL';

      if (type === 'GENERAL') {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('pagaralam')) {
          type = 'POLRES_PAGARALAM';
        } else if (lowerName.includes('palembang')) {
          type = 'POLRESTABES_PALEMBANG';
        }
      }

      this.logger.info('Resolved reporter profile context', { userId, name, type });

      return {
        name,
        type,
      };
    } catch (error) {
      this.logger.error('Failed to build reporter context, falling back to default', {
        error: error.message,
      });
      return {
        name: 'Wartawan',
        type: 'GENERAL',
      };
    }
  }

  async ingestStage1(draft) {
    const startTime = Date.now();
    this.logger.info('Stage 1 Ingest Engine starting', { chatId: draft.chatId });

    try {
      const reporterContext = await this.getReporterContext(draft.userId);
      const rawResult = await this.editorialEngine.processStage1(draft, reporterContext);
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
      const reporterContext = await this.getReporterContext(draft.userId);
      const rawResult = await this.editorialEngine.processStage3(
        draft,
        stage1Result,
        reporterContext
      );
      const validated = this.validator.validateEditorial(rawResult);

      const focusKeyword = stage1Result.seo?.focusKeyword || '';
      const metaDescription = stage1Result.seo?.metaDescription || '';
      const category = stage1Result.wordpress?.category || 'BERITA';
      const tags = stage1Result.wordpress?.tags || [];
      const score = stage1Result.newsValue?.score || 0;

      const fullText = `${validated.lead}\n\n${validated.body}`;
      const wordCount = fullText.split(/\s+/).filter(Boolean).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));
      const slug = slugify(validated.title);

      const finalResult = new EditorialResult({
        article: {
          title: validated.title,
          lead: validated.lead,
          content: validated.body,
          excerpt: validated.excerpt || validated.lead || '', // 🚀 Memetakan parameter excerpt hasil tulisan Stage 2
        },
        seo: {
          focusKeyword,
          metaDescription,
          category,
          tags,
          slug,
        },
        statistics: {
          wordCount,
          readingTime,
        },
        quality: {
          score,
          notes: validated.internal_qc || [validated.editor_notes],
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