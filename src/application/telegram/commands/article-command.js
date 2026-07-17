import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/index.js';

import { createDraft } from '../../services/editorial-session.js';
import { attachSourceText } from '../../services/draft-service.js';
import { createReviewKeyboard } from '../keyboards/index.js';

export async function articleCommand(
  update,
  telegramApi,
  sessionManager,
  context
) {
  let state = await sessionManager.getState(update.chatId);

  if (state === WORKFLOW_STATE.IDLE) {
    await sessionManager.create(
      update.chatId,
      update.userId,
      createDraft
    );

    state = WORKFLOW_STATE.WAITING_ARTICLE;
  }

  if (state !== WORKFLOW_STATE.WAITING_ARTICLE) {
    return telegramApi.sendMessage(
      update.chatId,
      'Masih ada proses yang sedang berjalan. Gunakan 📋 Status atau ❌ Batal jika diperlukan.'
    );
  }

  if (!update.hasText) {
    return telegramApi.sendMessage(
      update.chatId,
      [
        'Untuk tahap ini saya menerima naskah dalam bentuk teks.',
        '',
        'Dukungan OCR untuk foto dan dokumen akan ditambahkan pada milestone berikutnya.'
      ].join('\n')
    );
  }

  const draft = await sessionManager.get(update.chatId);

  // 1. Simpan naskah asli
  const draftWithSource = attachSourceText(
    draft,
    update.text
  );

  // 2. Kirim ke Editorial Service untuk diproses (saat ini masih statis)
  const editorialService = context.container.resolve(TOKENS.EDITORIAL_SERVICE);
  const editorialResult = await editorialService.generate(draftWithSource);

  // 3. Gabungkan hasil ke draft baru dan perbarui state menjadi WAITING_REVIEW
  const updatedDraft = {
    ...draftWithSource,
    state: WORKFLOW_STATE.WAITING_REVIEW,
    editorial: editorialResult,
    updatedAt: new Date().toISOString()
  };

  await sessionManager.save(updatedDraft);

  // 4. Kirim Preview ke Telegram
  return telegramApi.sendMessage(
    update.chatId,
    [
      '✅ Berita berhasil diolah oleh AI!',
      '',
      `📰 *JUDUL*`,
      editorialResult.title,
      '',
      `📝 *LEAD*`,
      editorialResult.lead,
      '',
      `📊 *STATISTIK*`,
      `Jumlah Kata: ${editorialResult.wordCount}`,
      `Estimasi Baca: ${editorialResult.readingTime} Menit`,
      '',
      'Silakan periksa draf di atas dan pilih tindakan di bawah.'
    ].join('\n'),
    createReviewKeyboard()
  );
}