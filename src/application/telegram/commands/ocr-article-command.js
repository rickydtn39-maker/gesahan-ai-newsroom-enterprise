import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/tokens.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { createDraft } from '../../services/editorial-session.js';
import { attachSourceText } from '../../services/draft-service.js';
import { createAngleKeyboard } from '../keyboards/index.js';

export async function ocrArticleCommand(update, telegramApi, sessionManager, container) {
  let state = await sessionManager.getState(update.chatId);

  if (state === WORKFLOW_STATE.IDLE) {
    await sessionManager.create(update.chatId, update.userId, createDraft);
    state = WORKFLOW_STATE.WAITING_ARTICLE;
  }

  if (state !== WORKFLOW_STATE.WAITING_ARTICLE && state !== WORKFLOW_STATE.IDLE) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.WORKFLOW.ACTIVE_PROCESS);
  }

  const fileId = update.photo ? update.photo.file_id : update.document?.file_id;
  if (!fileId) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.OCR.INPUT_INVALID);
  }

  // ✅ DIBERSIHKAN: Mengirim pesan indikator proses OCR (bukan status gagal)
  await telegramApi.sendMessage(update.chatId, '🔍 *Memindai gambar/dokumen (OCR)...* Mohon tunggu sebentar.');

  try {
    const downloadedFile = await telegramApi.downloadFile(fileId);
    const ocrProvider = container.resolve(TOKENS.OCR_PROVIDER);
    const extractedText = await ocrProvider.extractText(
      downloadedFile.buffer,
      downloadedFile.mimeType
    );

    const draft = await sessionManager.get(update.chatId);
    const draftWithSource = attachSourceText(draft, extractedText);
    await sessionManager.save(draftWithSource);

    const editorialService = container.resolve(TOKENS.EDITORIAL_SERVICE);
    const stage1Result = await editorialService.ingestStage1(draftWithSource);

    // ✅ DILENGKAPI: Proteksi Confidence Score
    if (stage1Result.confidence.ocrAccuracy < 90) {
      await sessionManager.cancel(update.chatId);
      return telegramApi.sendMessage(
        update.chatId,
        `⚠️ *Akurasi OCR Rendah (${stage1Result.confidence.ocrAccuracy}%)*\n\nTeks dari gambar terlalu kabur atau tidak terbaca dengan jelas. Silakan kirim ulang gambar dengan kualitas lebih baik atau ketik teks naskah secara manual.`
      );
    }

    const updatedDraft = draftWithSource.copyWith({
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
        '📊 *HASIL ANALISIS INGEST GEMINI (STAGE 1 - OCR)*',
        '━━━━━━━━━━━━━━━━━━',
        `🏷️ *Kategori:* ${stage1Result.wordpress.category}`,
        `🔑 *Keyword:* ${stage1Result.seo.focusKeyword}`,
        `🚨 *Prioritas:* ${priorityIcons[stage1Result.priority] || stage1Result.priority}`,
        `📈 *News Score:* ${stage1Result.newsValue.score}/100`,
        `🎯 *Draf Sementara Reporter:* "${stage1Result.draftReporter.title}"`,
        '━━━━━━━━━━━━━━━━━━',
        '',
        '✍️ *STAGE 2: TENTUKAN SUDUT PANDANG (ANGLE)*',
        'Silakan ketik angle khusus Anda atau klik tombol di bawah untuk default AI.',
      ].join('\n'),
      createAngleKeyboard()
    );
  } catch (error) {
    await sessionManager.cancel(update.chatId);
    return telegramApi.sendMessage(
      update.chatId,
      `${MESSAGES.WORKFLOW.STAGE1_FAILED}${error.message}\n\nSesi dibatalkan.`
    );
  }
}