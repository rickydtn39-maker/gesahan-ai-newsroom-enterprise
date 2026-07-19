import { WORDPRESS_CATEGORY_MAP } from '../../../../infrastructure/providers/wordpress/category-map.js';
import { getGeminiPassTemplate } from '../templates/gemini-pass-template.js';
import { getGptPassTemplate } from '../templates/gpt-pass-template.js';

export class EditorialBuilder {
  buildGeminiPass(job) {
    const allowedCategories = Object.keys(WORDPRESS_CATEGORY_MAP).join(', ');
    return getGeminiPassTemplate(allowedCategories, job.source.text);
  }

  buildChatGptPass(job, geminiResult) {
    const guide = job.engine;
    
    const angleInstruction = job.angle 
      ? `### ANGLE UTAMA YANG DIINSTRUKSIKAN WARTAWAN (WAJIB INJECT DAN JADIKAN SUDUT PANDANG UTAMA):\n- ${job.angle}`
      : `### ANGLE / SUDUT PANDANG PENULISAN:\n- Tentukan angle terbaik secara otomatis berdasarkan nilai berita tertinggi (default AI).`;

    const geminiResultJson = JSON.stringify(geminiResult, null, 2);

    return getGptPassTemplate(angleInstruction, guide, geminiResultJson, job.source.text);
  }
}