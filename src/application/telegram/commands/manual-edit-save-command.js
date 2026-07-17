import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { createReviewKeyboard } from '../keyboards/index.js';

export async function manualEditSaveCommand(
  update,
  telegramApi,
  sessionManager
) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(
      update.chatId,
      'Draft tidak ditemukan.'
    );
  }

  if (draft.state !== WORKFLOW_STATE.WAITING_MANUAL_EDIT) {
    return telegramApi.sendMessage(
      update.chatId,
      'Sistem tidak sedang dalam mode edit manual.'
    );
  }

  if (!update.hasText) {
    return telegramApi.sendMessage(
      update.chatId,
      'Silakan kirim teks artikel yang sudah diedit.'
    );
  }

  const previous = draft.editorial ?? {
    article: {},
    seo: {},
    statistics: {},
    quality: {}
  };

  const content = update.text.trim();
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const updatedDraft = {
    ...draft,
    state: WORKFLOW_STATE.WAITING_REVIEW,
    editorial: {
      ...previous,
      article: {
        title: previous.article?.title ?? 'Tanpa Judul',
        lead: previous.article?.lead ?? '',
        content
      },
      statistics: {
        wordCount,
        readingTime: Math.max(1, Math.ceil(wordCount / 200))
      },
      quality: {
        score: previous.quality?.score ?? 0,
        notes: ['Artikel telah diedit manual oleh wartawan.']
      }
    },
    updatedAt: new Date().toISOString()
  };

  await sessionManager.save(updatedDraft);

  return telegramApi.sendMessage(
    update.chatId,
    [
      '✅ Edit manual disimpan.',
      '',
      'Artikel siap ditinjau kembali.',
      '',
      'Gunakan 📄 Lihat Artikel Lengkap untuk membaca hasil akhir.',
      '',
      'Silakan pilih tindakan berikutnya.'
    ].join('\n'),
    createReviewKeyboard()
  );
}