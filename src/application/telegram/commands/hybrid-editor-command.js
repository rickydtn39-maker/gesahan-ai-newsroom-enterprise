// FILE: src/application/telegram/commands/hybrid-editor-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { QueueManager } from '../../../infrastructure/queue/queue-manager.js';

export async function hybridWaitingTitleHandler(update, telegramApi, sessionManager) {
  const incomingText = (update.text || '').trim();

  if (!incomingText) {
    return telegramApi.sendMessage(
      update.chatId,
      '⚠️ *Judul tidak boleh kosong.*\n\nSilakan masukkan Judul Berita Anda:'
    );
  }

  const draft = await sessionManager.get(update.chatId);
  if (!draft) return;

  const updatedDraft = draft.copyWith({
    state: WORKFLOW_STATE.HYBRID_WAITING_BODY,
    hybridTitle: incomingText,
  });

  await sessionManager.save(updatedDraft);

  return telegramApi.sendMessage(
    update.chatId,
    [
      '✅ *Judul Berhasil Disimpan!*',
      `📝 *Judul:* "${incomingText}"`,
      '',
      'Silakan kirim *Narasi Lengkap Berita* Anda:',
      '_(Format paragraf panjang akan aman digabungkan secara otomatis)_',
    ].join('\n')
  );
}

export async function hybridWaitingBodyHandler(update, telegramApi, sessionManager, container) {
  const incomingText = (update.text || '').trim();

  if (!incomingText) {
    return telegramApi.sendMessage(
      update.chatId,
      '⚠️ *Narasi tidak boleh kosong.*\n\nSilakan kirim narasi lengkap berita:'
    );
  }

  const draft = await sessionManager.get(update.chatId);
  if (!draft) return;

  // 🛡️ DEBOUNCE BUFFER ACCUMULATION: Menggabungkan potongan chat Telegram yang terpisah secara otomatis
  const existingBody = draft.hybridBody || '';
  const combinedBody = existingBody ? `${existingBody}\n${incomingText}` : incomingText;
  const nextPartCount = (draft.bufferPartCount || 0) + 1;
  const currentTimestamp = Date.now();

  const draftWithBody = draft.copyWith({
    hybridBody: combinedBody,
    bufferTimestamp: currentTimestamp,
    bufferPartCount: nextPartCount,
  });

  await sessionManager.save(draftWithBody);

  if (nextPartCount === 1) {
    await telegramApi.sendMessage(
      update.chatId,
      '📥 *Menerima narasi...* Menggabungkan potongan teks jika ada (mohon tunggu 2 detik).'
    );
  }

  const delayMs = 2000;
  const draftId = draft.id;
  const chatId = update.chatId;
  const ctx = container.has('ctx') ? container.resolve('ctx') : null;

  const processHybridBodyTask = async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const latestDraft = await sessionManager.get(chatId);
    if (!latestDraft || latestDraft.id !== draftId) return;
    if (latestDraft.bufferTimestamp !== currentTimestamp) return;

    // Kunci status draf ke tahap pemrosesan antrean Gemini
    const lockedDraft = latestDraft.copyWith({
      state: WORKFLOW_STATE.HYBRID_ANALYZING,
      bufferPartCount: 0, // Reset hitungan buffer
    });
    await sessionManager.save(lockedDraft);

    await telegramApi.sendMessage(
      chatId,
      '⏳ *Naskah Hybrid Masuk Antrean!* Menjadwalkan giliran analisis editorial di Cloud...'
    );

    await QueueManager.add(chatId, update.userId, 'HYBRID_STAGE_3_ANALYZE', {}, container);
  };

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(processHybridBodyTask());
  } else {
    processHybridBodyTask();
  }
}

export async function hybridWaitingImageHandler(update, telegramApi, sessionManager, container) {
  if (!update.hasPhoto) {
    return telegramApi.sendMessage(
      update.chatId,
      '❌ *Format Salah!* Harap kirimkan foto/gambar utama sebagai lampiran media.'
    );
  }

  const draft = await sessionManager.get(update.chatId);
  if (!draft) return;

  const updatedDraft = draft.copyWith({
    state: WORKFLOW_STATE.HYBRID_PUBLISHING,
    source: {
      ...draft.source,
      featuredImage: {
        fileId: update.photo.file_id,
        fileUniqueId: update.photo.file_unique_id,
        width: update.photo.width,
        height: update.photo.height,
      },
    },
  });

  await sessionManager.save(updatedDraft);

  await telegramApi.sendMessage(
    update.chatId,
    '⏳ *Gambar Utama Diterima!* Memulai proses publikasi aman dan optimasi metadata Yoast SEO ke WordPress...'
  );

  await QueueManager.add(update.chatId, update.userId, 'HYBRID_PUBLISH', {}, container);
}
