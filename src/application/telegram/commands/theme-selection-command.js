import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { createAngleKeyboard } from '../keyboards/index.js';

export async function themeSelectionCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);
  if (!draft || draft.state !== WORKFLOW_STATE.WAITING_THEME_SELECTION) {
    return telegramApi.sendMessage(update.chatId, 'Sistem tidak sedang menunggu pemilihan tema.');
  }

  const text = (update.text || '').trim();

  // Mencocokkan ID tema dari teks tombol: "🎯 Tema 1: Judul Pembahasan..."
  const match = text.match(/🎯\s*Tema\s*(\d+):/i);
  if (!match) {
    return telegramApi.sendMessage(
      update.chatId,
      '⚠️ Pilihan tidak valid. Silakan pilih salah satu tema pada tombol menu di bawah.'
    );
  }

  const themeId = parseInt(match[1], 10);
  const themes = draft.stage1Multi?.themes || [];
  const selectedTheme = themes.find((t) => t.id === themeId);

  if (!selectedTheme) {
    return telegramApi.sendMessage(
      update.chatId,
      '❌ Tema yang Anda pilih tidak ditemukan atau sudah diproses. Silakan pilih tema yang tersedia.'
    );
  }

  // Petakan tema terpilih ke skema tunggal Stage 1
  const stage1Result = {
    extractedInfo: selectedTheme.extractedInfo,
    seo: selectedTheme.seo,
    wordpress: selectedTheme.wordpress,
    newsValue: selectedTheme.newsValue,
    priority: selectedTheme.priority,
    confidence: selectedTheme.confidence,
    draftReporter: selectedTheme.draftReporter,
    id: selectedTheme.id, // Amankan ID tema untuk proses eliminasi saat sukses terbit
  };

  const updatedDraft = draft.copyWith({
    state: WORKFLOW_STATE.WAITING_ANGLE,
    stage1: stage1Result,
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
      `🎯 *TEMA BERHASIL DIPILIH: Tema ${selectedTheme.id}*`,
      '━━━━━━━━━━━━━━━━━━',
      `🏷️ *Kategori:* ${selectedTheme.wordpress.category}`,
      `🔑 *Keyword:* ${selectedTheme.seo.focusKeyword}`,
      `🚨 *Prioritas:* ${priorityIcons[selectedTheme.priority] || selectedTheme.priority}`,
      `📈 *News Score:* ${selectedTheme.newsValue.score}/100`,
      `🎯 *Draf Sementara Reporter:* "${selectedTheme.draftReporter.title}"`,
      '━━━━━━━━━━━━━━━━━━',
      '',
      '✍️ *STAGE 2: TENTUKAN SUDUT PANDANG (ANGLE)*',
      'Silakan ketik angle khusus Anda atau klik tombol di bawah untuk default AI.',
    ].join('\n'),
    createAngleKeyboard()
  );
}