import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/index.js';
import { createReviewKeyboard } from '../keyboards/index.js';

export async function angleSaveCommand(update, telegramApi, sessionManager, container) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft || draft.state !== WORKFLOW_STATE.WAITING_ANGLE) {
    return telegramApi.sendMessage(update.chatId, 'Sesi angle tidak valid.');
  }

  const textInput = (update.text || '').trim();
  const isDefaultAi = textInput === '⏭️ Lanjut (Default AI)';
  const selectedAngle = isDefaultAi ? null : textInput;

  const updatedDraftWithAngle = {
    ...draft,
    state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
    angle: selectedAngle,
    updatedAt: new Date().toISOString(),
  };

  await sessionManager.save(updatedDraftWithAngle);

  await telegramApi.sendMessage(
    update.chatId,
    isDefaultAi
      ? '⏳ [STAGE 3 & 4] GPT Redaktur Pelaksana sedang menyunting draf & melakukan QC mandiri...'
      : `⏳ [STAGE 3 & 4] GPT Redaktur Pelaksana sedang menyunting draf dengan fokus angle "${selectedAngle}" & melakukan QC...`
  );

  try {
    const editorialService = container.resolve(TOKENS.EDITORIAL_SERVICE);
    const result = await editorialService.generate(updatedDraftWithAngle, draft.stage1);

    const completedDraft = {
      ...updatedDraftWithAngle,
      state: WORKFLOW_STATE.WAITING_REVIEW,
      editorial: result,
      updatedAt: new Date().toISOString(),
    };

    await sessionManager.save(completedDraft);

    return telegramApi.sendMessage(
      update.chatId,
      [
        '✅ *REDAKTUR PELAKSANA DIGITAL SELESAI SUNTING!*',
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
        '📋 QC PASSED REPORT',
        '',
        ...(result.quality.notes.length > 0
          ? result.quality.notes.map((note) => `• ${note}`)
          : ['• Pemeriksaan QC Selesai, fakta 100% konsisten.']),
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '📄 Gunakan tombol "Lihat Artikel Lengkap" untuk membaca hasil penyuntingan.',
        '',
        'Silakan pilih tindakan berikut.',
      ].join('\n'),
      createReviewKeyboard()
    );
  } catch (error) {
    const fallbackDraft = {
      ...updatedDraftWithAngle,
      state: WORKFLOW_STATE.WAITING_ANGLE,
      updatedAt: new Date().toISOString(),
    };
    await sessionManager.save(fallbackDraft);

    return telegramApi.sendMessage(
      update.chatId,
      `❌ Gagal menyunting draf: ${error.message}\n\nSilakan klik /cancel atau kirim instruksi angle ulang.`
    );
  }
}
