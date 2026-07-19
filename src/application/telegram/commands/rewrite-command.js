import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/tokens.js';
import { createReviewKeyboard } from '../keyboards/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';

export async function rewriteCommand(update, telegramApi, sessionManager, container) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.NOT_FOUND);
  }

  if (draft.state !== WORKFLOW_STATE.WAITING_REVIEW) {
    return telegramApi.sendMessage(
      update.chatId,
      'Sistem tidak dapat melakukan rewrite pada tahap ini.'
    );
  }

  await telegramApi.sendMessage(
    update.chatId,
    '⏳ Menginstruksikan AI untuk menulis ulang artikel dari naskah asli...'
  );

  try {
    const editorialService = container.resolve(TOKENS.EDITORIAL_SERVICE);
    const result = await editorialService.generate(draft, draft.stage1);

    const updatedDraft = draft.copyWith({
      editorial: result,
    });

    await sessionManager.save(updatedDraft);

    return telegramApi.sendMessage(
      update.chatId,
      [
        '✅ AI berhasil menyusun ulang artikel.',
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '📰 JUDUL (REWRITE)',
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
        '📄 Gunakan tombol "Lihat Artikel Lengkap" untuk membaca hasil terbaru.',
        '',
        'Silakan pilih tindakan berikut.',
      ].join('\n'),
      createReviewKeyboard()
    );
  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      ['⚠ AI gagal menulis ulang naskah.', '', error.message, '', 'Silakan coba kembali.'].join(
        '\n'
      ),
      createReviewKeyboard()
    );
  }
}
