import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/index.js';
import { createReviewKeyboard } from '../keyboards/index.js';

export async function rewriteCommand(update, telegramApi, sessionManager, container) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, 'Draft tidak ditemukan.');
  }

  // Validasi: Hanya bisa rewrite jika masih di tahap review
  if (draft.state !== WORKFLOW_STATE.WAITING_REVIEW) {
    return telegramApi.sendMessage(
      update.chatId,
      'Sistem tidak dapat melakukan rewrite pada tahap ini.'
    );
  }

  // Notifikasi proses berjalan
  await telegramApi.sendMessage(
    update.chatId,
    '⏳ Menginstruksikan AI untuk menulis ulang artikel dari naskah asli...'
  );

  try {
    const editorialService = container.resolve(TOKENS.EDITORIAL_SERVICE);

    // Menjalankan ulang AI berdasarkan naskah asli (draft.source) yang tersimpan di memori
    const result = await editorialService.generate(draft);

    const updatedDraft = {
      ...draft,
      editorial: result, // Menggantikan editorial lama dengan hasil rewrite baru
      updatedAt: new Date().toISOString(),
    };

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
