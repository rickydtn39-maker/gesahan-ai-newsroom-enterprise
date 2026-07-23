// FILE: src/application/telegram/commands/angle-save-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/tokens.js';
import { createReviewKeyboard } from '../keyboards/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';

function escapeMarkdown(text) {
  if (!text) return '';
  return text.toString().replace(/[_*`[\]]/g, '\\$&');
}

export async function angleSaveCommand(update, telegramApi, sessionManager, container) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft || draft.state !== WORKFLOW_STATE.WAITING_ANGLE) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.NOT_FOUND);
  }

  const textInput = (update.text || '').trim();
  const isDefaultAi = textInput === '⏭️ Lanjut (Default AI)';
  const selectedAngle = isDefaultAi ? null : textInput;

  const updatedDraftWithAngle = draft.copyWith({
    state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
    angle: selectedAngle,
  });

  await sessionManager.save(updatedDraftWithAngle);

  await telegramApi.sendMessage(
    update.chatId,
    isDefaultAi
      ? '⏳ [STAGE 3 & 4] GPT Redaktur Pelaksana sedang menyunting draf & melakukan QC mandiri...'
      : `⏳ [STAGE 3 & 4] GPT Redaktur Pelaksana sedang menyunting draf dengan fokus angle "${escapeMarkdown(selectedAngle)}" & melakukan QC...`
  );

  try {
    const editorialService = container.resolve(TOKENS.EDITORIAL_SERVICE);
    const result = await editorialService.generate(updatedDraftWithAngle, draft.stage1);

    const completedDraft = updatedDraftWithAngle.copyWith({
      state: WORKFLOW_STATE.WAITING_REVIEW,
      editorial: result,
    });

    await sessionManager.save(completedDraft);

    // Escape seluruh variabel dinamis sebelum dicetak ke Markdown Parser Telegram
    const escapedTitle = escapeMarkdown(result.article.title);
    const escapedLead = escapeMarkdown(result.article.lead);
    const escapedSlug = escapeMarkdown(result.seo.slug);
    const escapedKeyword = escapeMarkdown(result.seo.focusKeyword);
    const escapedCategory = escapeMarkdown(result.seo.category);

    return telegramApi.sendMessage(
      update.chatId,
      [
        '✅ *REDAKTUR PELAKSANA DIGITAL SELESAI SUNTING!*',
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '📰 JUDUL',
        '',
        escapedTitle,
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '📝 LEAD',
        '',
        escapedLead,
        '',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '🔍 SEO',
        '',
        `Slug : ${escapedSlug}`,
        `Keyword : ${escapedKeyword}`,
        `Kategori : ${escapedCategory}`,
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
          ? result.quality.notes.map((note) => `• ${escapeMarkdown(note)}`)
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
    const fallbackDraft = updatedDraftWithAngle.copyWith({
      state: WORKFLOW_STATE.WAITING_ANGLE,
    });
    await sessionManager.save(fallbackDraft);

    return telegramApi.sendMessage(
      update.chatId,
      `❌ Gagal menyunting draf: ${error.message}\n\nSilakan klik /cancel atau kirim instruksi angle ulang.`
    );
  }
}