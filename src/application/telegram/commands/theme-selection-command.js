// FILE: src/application/telegram/commands/theme-selection-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { createAngleKeyboard } from '../keyboards/index.js';

export async function themeSelectionCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft || draft.state !== WORKFLOW_STATE.WAITING_THEME_SELECTION) {
    return telegramApi.sendMessage(update.chatId, 'Sistem tidak sedang dalam mode pemilihan tema berita.');
  }

  const textInput = (update.text || '').trim();
  const match = textInput.match(/Tema (\d+):/i);

  if (!match) {
    return telegramApi.sendMessage(
      update.chatId,
      '⚠️ Pilihan tidak valid. Silakan klik salah satu tombol tema yang tersedia.'
    );
  }

  const selectedIndex = parseInt(match[1]) - 1;
  const themes = draft.stage1Multi?.themes || [];

  if (selectedIndex < 0 || selectedIndex >= themes.length) {
    return telegramApi.sendMessage(
      update.chatId,
      '❌ Tema yang Anda pilih tidak ditemukan di database draf.'
    );
  }

  const selectedThemeData = themes[selectedIndex];

  // Amankan data tema terpilih ke draf utama, dan ubah status ke WAITING_ANGLE
  const updatedDraft = draft.copyWith({
    state: WORKFLOW_STATE.WAITING_ANGLE,
    stage1: selectedThemeData, // Masuk ke pipeline normal draf tunggal
  });

  await sessionManager.save(updatedDraft);

  const priorityIcons = {
    A: '🔴 [A - BREAKING NEWS]',
    B: '🟡 [B - PUBLISH TODAY]',
    C: '🟢 [C - EVERGREEN]',
  };

  return telegramApi.sendMessage(
    update.chatId,
    [
      `🎯 *TEMA ${selectedIndex + 1} BERHASIL DIPILIH!*`,
      '━━━━━━━━━━━━━━━━━━',
      `🏷️ *Kategori:* ${selectedThemeData.wordpress.category}`,
      `🔑 *Keyword:* ${selectedThemeData.seo.focusKeyword}`,
      `🚨 *Prioritas:* ${priorityIcons[selectedThemeData.priority] || selectedThemeData.priority}`,
      `📈 *News Score:* ${selectedThemeData.newsValue.score}/100`,
      `🎯 *Draf Reporter:* "${selectedThemeData.draftReporter.title}"`,
      '━━━━━━━━━━━━━━━━━━',
      '',
      '✍ *STAGE 2: TENTUKAN SUDUT PANDANG (ANGLE)*',
      'Silakan ketik angle khusus Anda atau klik tombol di bawah untuk default AI.',
    ].join('\n'),
    createAngleKeyboard()
  );
}