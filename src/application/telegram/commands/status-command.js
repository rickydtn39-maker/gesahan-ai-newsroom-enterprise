// FILE: src/application/telegram/commands/status-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';

export async function statusCommand(update, telegramApi, sessionManager) {
  const draft = await sessionManager.get(update.chatId);

  if (!draft || draft.state === WORKFLOW_STATE.IDLE) {
    return telegramApi.sendMessage(
      update.chatId,
      ['Tidak ada draft aktif.', '', 'Tekan 📰 Berita Baru untuk memulai.'].join('\n')
    );
  }

  const title = draft.hybridTitle || '-';
  const metadata = draft.hybridMetadata;
  const wordCount = draft.hybridBody ? draft.hybridBody.split(/\s+/).filter(Boolean).length : 0;

  return telegramApi.sendMessage(
    update.chatId,
    [
      '📋 STATUS DRAFT (HYBRID EDITOR)',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      `ID Sesi : ${draft.id}`,
      `Status Sesi : ${draft.state}`,
      '',
      `Judul Berita : "${title}"`,
      `Jumlah Teks : ${wordCount} kata`,
      metadata ? `Kategori AI : ${metadata.category}` : 'Kategori AI : -',
      metadata ? `Subkategori : ${metadata.subcategory}` : 'Subkategori : -',
      metadata ? `Estimasi Baca : ${metadata.reading_time} menit` : 'Estimasi Baca : -',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n')
  );
}