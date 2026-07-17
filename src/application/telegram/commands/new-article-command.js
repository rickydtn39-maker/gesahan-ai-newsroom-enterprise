import { createDraft } from '../../services/editorial-session.js';

export async function newArticleCommand(
  update,
  telegramApi,
  draftRepository
) {
  const existing = await draftRepository.findByChatId(update.chatId);

  if (existing) {
    return telegramApi.sendMessage(
      update.chatId,
      [
        '⚠️ Anda masih memiliki draft yang belum selesai.',
        '',
        'Ketik ❌ Batal jika ingin menghapus draft tersebut.'
      ].join('\n')
    );
  }

  const draft = createDraft(update.chatId, update.userId);

  await draftRepository.save(draft);

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
      'Anda dapat membatalkan kapan saja dengan menekan ❌ Batal.'
    ].join('\n')
  );
}