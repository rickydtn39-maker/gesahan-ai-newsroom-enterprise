// FILE: src/application/telegram/commands/manual-edit-save-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { createReviewKeyboard } from '../keyboards/index.js';
import { MESSAGES } from '../../../core/constants/messages.js';

export async function manualEditSaveCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.DRAFT.NOT_FOUND);
  }

  if (draft.state !== WORKFLOW_STATE.WAITING_MANUAL_EDIT) {
    return telegramApi.sendMessage(update.chatId, 'Sistem tidak sedang dalam mode edit manual.');
  }

  if (!update.hasText) {
    return telegramApi.sendMessage(update.chatId, 'Silakan kirim teks artikel yang sudah diedit.');
  }

  // 🚀 DEFENSIVE HYDRATION: Menjamin properti SEO tidak ter-wipe jika draf editorial bernilai parsial/null
  const previous = draft.editorial ?? {
    article: {},
    seo: {
      focusKeyword: draft.stage1?.seo?.focusKeyword ?? '',
      metaDescription: draft.stage1?.seo?.metaDescription ?? '',
      category: draft.stage1?.wordpress?.category ?? 'BERITA',
      tags: draft.stage1?.wordpress?.tags ?? [],
      slug: '',
    },
    statistics: {},
    quality: {},
  };

  const content = update.text.trim();
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const updatedDraft = draft.copyWith({
    state: WORKFLOW_STATE.WAITING_REVIEW,
    editorial: {
      ...previous,
      article: {
        title: previous.article?.title ?? 'Tanpa Judul',
        lead: previous.article?.lead ?? '',
        content,
      },
      statistics: {
        wordCount,
        readingTime: Math.max(1, Math.ceil(wordCount / 200)),
      },
      quality: {
        score: previous.quality?.score ?? 0,
        notes: ['Artikel telah diedit manual oleh wartawan.'],
      },
    },
  });

  await sessionManager.save(updatedDraft);

  return telegramApi.sendMessage(update.chatId, MESSAGES.MANUAL_EDIT.SAVED, createReviewKeyboard());
}
