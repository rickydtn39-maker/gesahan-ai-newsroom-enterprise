import { EditorialResult } from './models/index.js';
import { EDITORIAL_RESPONSE_SCHEMA } from './schema/editorial-response-schema.js';
import { EditorialValidator } from './validator/index.js';

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')                   // Dekomposisi karakter beraksen (misal: "é" menjadi "e" + aksen)
    .replace(/[\u0300-\u036f]/g, '')     // Bersihkan tanda diakritik/aksen tersebut
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')               // Ganti spasi dengan tanda hubung -
    .replace(/[^\w-]+/g, '')            // Bersihkan semua karakter selain huruf, angka, dan tanda hubung (Tanpa escape '-')
    .replace(/--+/g, '-')               // Satukan tanda hubung yang berturut-turut (Tanpa escape '-')
    .replace(/^-+/, '')                 // Hapus tanda hubung di awal string
    .replace(/-+$/, '');                // Hapus tanda hubung di akhir string
}

export class EditorialService {
  constructor(editorialEngine, logger, metrics) {
    this.editorialEngine = editorialEngine;
    this.validator = new EditorialValidator();
    this.logger = logger;
    this.metrics = metrics;
  }

  async generate(draft) {
    const startTime = Date.now();
    this.logger.info('Starting Editorial Engine generation', { draftId: draft.id });

    try {
      const result = await this.editorialEngine.process({
        draft,
        ai: {
          model: 'gemini-2.5-flash',
          schema: EDITORIAL_RESPONSE_SCHEMA
        }
      });

      const validated = this.validator.validate(result);

      // ==========================================================
      // 🛠️ HEURISTIC CALCULATION (Perhitungan Deterministik Aplikasi)
      // ==========================================================
      // Gabungkan lead dan content untuk menghitung statistik total yang akurat
      const fullText = `${validated.article.lead}\n\n${validated.article.content}`;
      const wordCount = fullText.split(/\s+/).filter(Boolean).length;
      
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const slug = slugify(validated.article.title || '');

      const notes = [];
      let score = 100;

      if (wordCount < 200) {
        score -= 10;
        notes.push('Panjang artikel di bawah batas ideal (200 kata).');
      }

      const focusKeyword = validated.seo.focusKeyword?.toLowerCase();
      const leadText = validated.article.lead?.toLowerCase();
      if (focusKeyword && leadText && !leadText.includes(focusKeyword)) {
        score -= 15;
        notes.push('Optimasi SEO kurang optimal: Focus Keyword tidak terdeteksi di Lead.');
      }

      if (validated.article.title && validated.article.title.length > 75) {
        score -= 10;
        notes.push('Keterbacaan Headline: Judul melebihi batas ideal 75 karakter.');
      }

      if (notes.length === 0) {
        notes.push('Artikel sempurna dan memenuhi seluruh indikator redaksi Gesahan.');
      }
      // ==========================================================

      const finalResult = new EditorialResult({
        article: validated.article,
        seo: {
          ...validated.seo,
          slug
        },
        statistics: {
          wordCount,
          readingTime
        },
        quality: {
          score,
          notes
        }
      });

      const duration = Date.now() - startTime;
      this.logger.info('Editorial Engine generation completed', { draftId: draft.id, durationMs: duration });
      this.metrics.timing('ai_generation_duration', duration, { status: 'success' });
      this.metrics.increment('articles_generated', 1);

      return finalResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Editorial Engine generation failed', { draftId: draft.id, error: error.message });
      this.metrics.timing('ai_generation_duration', duration, { status: 'error' });
      this.metrics.increment('ai_generation_errors', 1);
      throw error;
    }
  }
}