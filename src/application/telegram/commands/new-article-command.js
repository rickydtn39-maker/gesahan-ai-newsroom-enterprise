import { createDraft } from '../../services/editorial-session.js';

export async function newArticleCommand(update, telegramApi, sessionManager) {
  const state = await sessionManager.getState(update.chatId);

  if (state !== 'IDLE') {
    return telegramApi.sendMessage(
      update.chatId,
      [
        '⚠️ Anda masih memiliki proses yang belum selesai.',
        '',
        'Tekan ❌ Batal jika ingin menghapus proses tersebut.',
      ].join('\n')
    );
  }

  await sessionManager.create(update.chatId, update.userId, createDraft);

  return telegramApi.sendMessage(
    update.chatId,
    [
      '✅ Draft baru berhasil dibuat.',
      '',
      'Silakan kirim:',
      '',
      '📰 Teks berita',
      '📷 Foto',
      '📄 Dokumen',
      '',
      'Saya akan mengolah berita menjadi artikel siap terbit.',
      '',
      'Tekan ❌ Batal kapan saja jika ingin membatalkan proses.',
    ].join('\n')
  );
}
