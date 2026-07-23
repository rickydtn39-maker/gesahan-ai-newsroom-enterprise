// FILE: src/application/telegram/commands/article-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/tokens.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { createDraft } from '../../services/editorial-session.js';
import { createAngleKeyboard, createThemeSelectionKeyboard } from '../keyboards/index.js';
import { fetchYoutubeTranscript } from '../../../infrastructure/providers/youtube/youtube-transcript.js';
import { getYoutubePassTemplate } from '../../editorial/prompt/templates/youtube-pass-template.js';
import { WORDPRESS_CATEGORY_MAP } from '../../../infrastructure/providers/wordpress/category-map.js';

export async function articleCommand(update, telegramApi, sessionManager, container) {
  let state = await sessionManager.getState(update.chatId);

  if (state === WORKFLOW_STATE.IDLE) {
    await sessionManager.create(update.chatId, update.userId, createDraft);
    state = WORKFLOW_STATE.WAITING_ARTICLE;
  }

  if (state !== WORKFLOW_STATE.WAITING_ARTICLE) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.WORKFLOW.ACTIVE_PROCESS);
  }

  if (!update.hasText) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.INTERACTION.INPUT_TEXT_REQUIRED);
  }

  const incomingText = (update.text || '').trim();

  // =========================================================================
  // 🚀 DETEKSI DAN PENANGANAN TAUTAN YOUTUBE (NOTEBOOKLM FLOW)
  // =========================================================================
  const isYoutubeLink = /youtube\.com|youtu\.be/i.test(incomingText);

  if (isYoutubeLink) {
    await telegramApi.sendMessage(
      update.chatId,
      '🎥 *Tautan YouTube Terdeteksi!*\n\nSistem sedang mengunduh transkrip dan menganalisis tema podcast ala Google NotebookLM. Mohon tunggu sebentar...'
    );

    try {
      // 1. Ambil transkrip dari YouTube
      const transcriptText = await fetchYoutubeTranscript(incomingText);
      const logger = container.resolve(TOKENS.LOGGER);
      logger.info('YouTube transcript fetched successfully', { chatId: update.chatId });

      // 2. Susun Prompt NotebookLM khusus Gemini
      const allowedCategories = Object.keys(WORDPRESS_CATEGORY_MAP).join(', ');
      const geminiPrompt = getYoutubePassTemplate(allowedCategories, transcriptText);

      // 3. Panggil Gemini AI Provider dengan format skema array tema
      const aiProvider = container.resolve(TOKENS.AI_PROVIDER);
      
      // Definisikan struktur skema respons agar tergaransi format array
      const youtubeResponseSchema = {
        type: 'object',
        required: ['themes'],
        properties: {
          themes: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'themeTitle', 'extractedInfo', 'seo', 'wordpress', 'newsValue', 'priority', 'confidence', 'draftReporter'],
              properties: {
                id: { type: 'number' },
                themeTitle: { type: 'string' },
                extractedInfo: {
                  type: 'object',
                  required: ['who', 'what', 'when', 'where', 'why', 'how', 'details'],
                  properties: {
                    who: { type: 'string' },
                    what: { type: 'string' },
                    when: { type: 'string' },
                    where: { type: 'string' },
                    why: { type: 'string' },
                    how: { type: 'string' },
                    details: {
                      type: 'object',
                      required: ['pangkat', 'jabatan', 'instansi', 'barangBukti', 'nomorPerkara', 'lokasi', 'kutipan'],
                      properties: {
                        pangkat: { type: 'string' },
                        jabatan: { type: 'string' },
                        instansi: { type: 'string' },
                        barangBukti: { type: 'string' },
                        nomorPerkara: { type: 'string' },
                        lokasi: { type: 'string' },
                        kutipan: { type: 'string' }
                      }
                    }
                  }
                },
                seo: {
                  type: 'object',
                  required: ['focusKeyword', 'secondaryKeywords', 'metaDescription'],
                  properties: {
                    focusKeyword: { type: 'string' },
                    secondaryKeywords: { type: 'array', items: { type: 'string' } },
                    metaDescription: { type: 'string' }
                  }
                },
                wordpress: {
                  type: 'object',
                  required: ['category', 'tags'],
                  properties: {
                    category: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } }
                  }
                },
                newsValue: {
                  type: 'object',
                  required: ['impact', 'conflict', 'humanInterest', 'novelty', 'publicInterest', 'score'],
                  properties: {
                    impact: { type: 'number' },
                    conflict: { type: 'number' },
                    humanInterest: { type: 'number' },
                    novelty: { type: 'number' },
                    publicInterest: { type: 'number' },
                    score: { type: 'number' }
                  }
                },
                priority: { type: 'string' },
                confidence: {
                  type: 'object',
                  required: ['ocrAccuracy'],
                  properties: { ocrAccuracy: { type: 'number' } }
                },
                draftReporter: {
                  type: 'object',
                  required: ['title', 'lead', 'content'],
                  properties: {
                    title: { type: 'string' },
                    lead: { type: 'string' },
                    content: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      };

      const result = await aiProvider.generate({
        prompt: geminiPrompt,
        schema: youtubeResponseSchema
      });

      if (!result.themes || result.themes.length === 0) {
        throw new Error('Analis AI gagal menemukan tema berita spesifik dari transkrip.');
      }

      // 4. Buat draf multi-tema dan masuk ke status WAITING_THEME_SELECTION
      const draft = await sessionManager.get(update.chatId);
      const updatedMultiDraft = draft.copyWith({
        state: WORKFLOW_STATE.WAITING_THEME_SELECTION,
        stage1Multi: result, // Amankan seluruh tema berita di properti khusus
        source: {
          ...draft.source,
          type: 'text',
          text: `[YouTube Video Transcript: ${incomingText}]`,
        }
      });

      await sessionManager.save(updatedMultiDraft);

      return telegramApi.sendMessage(
        update.chatId,
        [
          '🧠 *NOTEBOOKLM ANALYSIS SELESAI!*',
          '━━━━━━━━━━━━━━━━━━',
          `Sistem berhasil membedah podcast dan mendeteksi *${result.themes.length} Tema Berita* bernilai tinggi.`,
          '',
          'Silakan ketuk tombol di bawah untuk memilih tema berita yang ingin diproduksi terlebih dahulu:',
        ].join('\n'),
        createThemeSelectionKeyboard(result.themes)
      );

    } catch (error) {
      await sessionManager.cancel(update.chatId);
      return telegramApi.sendMessage(
        update.chatId,
        `❌ Gagal memproses tautan YouTube: ${error.message}\n\nSesi dibatalkan.`
      );
    }
  }

  // =========================================================================
  // 🚀 ALUR DEBOUNCE BUFFER UNTUK NASKAH TEKS BIASA (STANDARD FLOW)
  // =========================================================================
  const draft = await sessionManager.get(update.chatId);
  const existingText = draft.source?.text || '';
  const combinedText = existingText ? `${existingText}\n${incomingText}` : incomingText;
  const nextPartCount = (draft.bufferPartCount || 0) + 1;
  const currentTimestamp = Date.now();

  const draftWithSource = draft.copyWith({
    source: {
      ...draft.source,
      type: 'text',
      text: combinedText,
    },
    bufferTimestamp: currentTimestamp,
    bufferPartCount: nextPartCount,
  });

  await sessionManager.save(draftWithSource);

  if (nextPartCount === 1) {
    await telegramApi.sendMessage(
      update.chatId,
      '📥 *Menerima naskah...* Menggabungkan potongan dokumen berikutnya jika ada (mohon tunggu 2 detik).'
    );
  }

  const delayMs = 2000;
  const draftId = draft.id;
  const chatId = update.chatId;
  const ctx = container.has('ctx') ? container.resolve('ctx') : null;

  const processBufferTask = async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const latestDraft = await sessionManager.get(chatId);
    if (!latestDraft || latestDraft.id !== draftId) return;

    if (latestDraft.bufferTimestamp !== currentTimestamp) {
      return;
    }

    const lockedDraft = latestDraft.copyWith({
      state: WORKFLOW_STATE.EDITORIAL_PROCESSING,
    });
    await sessionManager.save(lockedDraft);

    await telegramApi.sendMessage(chatId, MESSAGES.WORKFLOW.STAGE1_LOADING);

    try {
      const editorialService = container.resolve(TOKENS.EDITORIAL_SERVICE);
      const stage1Result = await editorialService.ingestStage1(lockedDraft);

      const updatedDraft = lockedDraft.copyWith({
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
        chatId,
        [
          '📊 *HASIL ANALISIS INGEST GEMINI (STAGE 1)*',
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
      await sessionManager.cancel(chatId);
      return telegramApi.sendMessage(
        chatId,
        `${MESSAGES.WORKFLOW.STAGE1_FAILED}${error.message}\n\nSesi dibatalkan.`
      );
    }
  };

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(processBufferTask());
  } else {
    processBufferTask();
  }
}