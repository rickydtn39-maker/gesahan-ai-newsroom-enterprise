import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/index.js';

import { createDraft } from '../../services/editorial-session.js';
import { attachSourceText } from '../../services/draft-service.js';
import { createReviewKeyboard } from '../keyboards/index.js';

export async function articleCommand(
  update,
  telegramApi,
  sessionManager,
  container
) {
  let state = await sessionManager.getState(update.chatId);

  if (state === WORKFLOW_STATE.IDLE) {
    await sessionManager.create(
      update.chatId,
      update.userId,
      createDraft
    );

    state = WORKFLOW_STATE.WAITING_ARTICLE;
  }

  if (state !== WORKFLOW_STATE.WAITING_ARTICLE) {
    return telegramApi.sendMessage(
      update.chatId,
      'Masih ada proses yang sedang berjalan.'
    );
  }

  if (!update.hasText) {
    return telegramApi.sendMessage(
      update.chatId,
      'Silakan kirim berita dalam bentuk teks.'
    );
  }

  const draft = await sessionManager.get(update.chatId);

  const draftWithSource = attachSourceText(
    draft,
    update.text
  );

  await sessionManager.save(draftWithSource);

  try {
    const editorialService =
      container.resolve(
        TOKENS.EDITORIAL_SERVICE
      );

    const result =
      await editorialService.generate(
        draftWithSource
      );

    const updatedDraft = {
      ...draftWithSource,

      state: WORKFLOW_STATE.WAITING_REVIEW,

      editorial: result,

      updatedAt: new Date().toISOString()
    };

    await sessionManager.save(updatedDraft);

    return telegramApi.sendMessage(
      update.chatId,
      [
        '✅ AI berhasil menyusun artikel.',
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
          ? result.quality.notes.map(
              (note) => `• ${note}`
            )
          : ['• Tidak ada catatan.']),
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '📄 Gunakan tombol "Lihat Artikel Lengkap" untuk membaca seluruh artikel.',
        '',
        'Silakan pilih tindakan berikut.'
      ].join('\n'),
      createReviewKeyboard()
    );
  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      [
        '⚠ AI tidak dapat memproses berita.',
        '',
        error.message,
        '',
        'Silakan coba kembali.'
      ].join('\n')
    );
  }
}