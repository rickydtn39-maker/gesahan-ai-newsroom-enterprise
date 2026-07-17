import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/index.js';

import { createDraft } from '../../services/editorial-session.js';
import { attachSourceText } from '../../services/draft-service.js';
import { createReviewKeyboard } from '../keyboards/index.js';

export async function ocrArticleCommand(update, telegramApi, sessionManager, container) {
  let state = await sessionManager.getState(update.chatId);

  if (state === WORKFLOW_STATE.IDLE) {
    await sessionManager.create(update.chatId, update.userId, createDraft);
    state = WORKFLOW_STATE.WAITING_ARTICLE;
  }

  if (state !== WORKFLOW_STATE.WAITING_ARTICLE && state !== WORKFLOW_STATE.IDLE) {
    return telegramApi.sendMessage(update.chatId, 'Masih ada proses yang sedang berjalan.');
  }

  const fileId = update.photo ? update.photo.file_id : update.document?.file_id;

  if (!fileId) {
    return telegramApi.sendMessage(update.chatId, 'File foto atau dokumen tidak valid.');
  }

  await telegramApi.sendMessage(
    update.chatId,
    '🔍 Membaca dan mengekstrak teks dari gambar/dokumen (OCR)...'
  );

  try {
    // 1. Download File dari Telegram
    const downloadedFile = await telegramApi.downloadFile(fileId);

    // 2. OCR Extraction
    const ocrProvider = container.resolve(TOKENS.OCR_PROVIDER);
    const extractedText = await ocrProvider.extractText(
      downloadedFile.buffer,
      downloadedFile.mimeType
    );

    await telegramApi.sendMessage(
      update.chatId,
      '🤖 Teks berhasil diekstrak! Menginstruksikan AI untuk menyusun berita...'
    );

    // 3. Attach extracted text as Source Text
    const draft = await sessionManager.get(update.chatId);
    const draftWithSource = attachSourceText(draft, extractedText);
    await sessionManager.save(draftWithSource);

    // 4. Generate Article via Editorial Service
    const editorialService = container.resolve(TOKENS.EDITORIAL_SERVICE);
    const result = await editorialService.generate(draftWithSource);

    const updatedDraft = {
      ...draftWithSource,
      state: WORKFLOW_STATE.WAITING_REVIEW,
      editorial: result,
      updatedAt: new Date().toISOString(),
    };

    await sessionManager.save(updatedDraft);

    return telegramApi.sendMessage(
      update.chatId,
      [
        '✅ AI berhasil menyusun artikel dari dokumen/gambar.',
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '📰 JUDUL',
        '',
        result.article.title,
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '📝 LEAD',
        '',
        result.article.lead,
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '🔍 SEO',
        '',
        `Slug : ${result.seo.slug}`,
        `Keyword : ${result.seo.focusKeyword}`,
        `Kategori : ${result.seo.category}`,
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '📊 STATISTIK',
        '',
        `Jumlah Kata : ${result.statistics.wordCount}`,
        `Estimasi Baca : ${result.statistics.readingTime} menit`,
        `Editorial Score : ${result.quality.score}/100`,
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '📋 CATATAN EDITOR',
        '',
        ...(result.quality.notes.length > 0
          ? result.quality.notes.map((note) => `• ${note}`)
          : ['• Tidak ada catatan.']),
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '📄 Gunakan tombol "Lihat Artikel Lengkap" untuk membaca seluruh artikel.',
        '',
        'Silakan pilih tindakan berikut.',
      ].join('\n'),
      createReviewKeyboard()
    );
  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      [
        '⚠️ Gagal memproses gambar/dokumen.',
        '',
        error.message,
        '',
        'Silakan coba kirim ulang atau ketik dalam bentuk teks biasa.',
      ].join('\n')
    );
  }
}
