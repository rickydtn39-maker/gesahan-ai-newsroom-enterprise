import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/index.js';
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
    return telegramApi.sendMessage(update.chatId, 'Masih ada proses yang sedang berjalan.');
  }

  const fileId = update.photo ? update.photo.file_id : update.document?.file_id;
  if (!fileId) {
    return telegramApi.sendMessage(update.chatId, 'File foto atau dokumen tidak valid.');
  }

  await telegramApi.sendMessage(
    update.chatId,
    '🔍 [STAGE 1] Gemini Reporter sedang mengunduh media dan mengekstrak teks (OCR)...'
  );

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

    // Proteksi Confidence Score
    if (stage1Result.confidence.ocrAccuracy < 90) {
      await sessionManager.cancel(update.chatId);
      return telegramApi.sendMessage(
        update.chatId,
        `⚠️ *AKURASI OCR TERLALU RENDAH* (${stage1Result.confidence.ocrAccuracy}%)\n\nFoto/dokumen yang dikirim buram atau tidak terbaca jelas. Silakan kirim ulang foto yang lebih tajam.`
      );
    }

    const updatedDraft = {
      ...draftWithSource,
      state: WORKFLOW_STATE.WAITING_ANGLE,
      stage1: stage1Result,
      updatedAt: new Date().toISOString(),
    };

    await sessionManager.save(updatedDraft);

    const priorityIcons = {
      A: '🔴 [A - BREAKING NEWS]',
      B: '🟡 [B - PUBLISH TODAY]',
      C: '🟢 [C - EVERGREEN]',
    };

    return telegramApi.sendMessage(
      update.chatId,
      [
        '📊 *HASIL ANALISIS INGEST GEMINI (STAGE 1)*',
        '━━━━━━━━━━━━━━━━━━',
        `🏷️ *Kategori:* ${stage1Result.wordpress.category}`,
        `🔑 *Keyword:* ${stage1Result.seo.focusKeyword}`,
        `🚨 *Prioritas:* ${priorityIcons[stage1Result.priority] || stage1Result.priority}`,
        `📈 *News Score:* ${stage1Result.newsValue.score}/100`,
        `🎯 *Draf Sementara Reporter:* "${stage1Result.draftReporter.title}"`,
        `👁️ *Akurasi OCR:* ${stage1Result.confidence.ocrAccuracy}%`,
        '━━━━━━━━━━━━━━━━━━',
        '',
        '✍️ *STAGE 2: TENTUKAN SUDUT PANDANG (ANGLE)*',
        'Silakan ketik angle khusus Anda (Contoh: "fokus pada kesedihan keluarga korban") atau klik tombol di bawah untuk default AI.',
      ].join('\n'),
      createAngleKeyboard()
    );
  } catch (error) {
    await sessionManager.cancel(update.chatId);
    return telegramApi.sendMessage(update.chatId, `❌ OCR Ingest gagal: ${error.message}`);
  }
}
