// FILE: src/application/telegram/commands/article-command.js

import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/tokens.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { createDraft } from '../../services/editorial-session.js';
import { createThemeSelectionKeyboard } from '../keyboards/index.js';
import { fetchYoutubeTranscript } from '../../../infrastructure/providers/youtube/youtube-transcript.js';
import { getYoutubePassTemplate } from '../../editorial/prompt/templates/youtube-pass-template.js';
import { WORDPRESS_CATEGORY_MAP } from '../../../infrastructure/providers/wordpress/category-map.js';
import { QueueManager } from '../../../infrastructure/queue/queue-manager.js';

export async function articleCommand(update, telegramApi, sessionManager, container, origin = null) {
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
  const isYoutubeLink = /youtube\.com|youtu\.be/i.test(incomingText);

  // =========================================================================
  // 🎥 PENANGANAN NOTEBOOKLM YOUTUBE LINK
  // =========================================================================
  if (isYoutubeLink) {
    await telegramApi.sendMessage(
      update.chatId,
      '🎥 *Tautan YouTube Terdeteksi!*\n\nSistem sedang mengunduh transkrip dan menganalisis tema podcast ala Google NotebookLM. Mohon tunggu sebentar...'
    );

    try {
      const env = container.has('env') ? container.resolve('env') : {};
      
      // Ambil domain origin dinamis dari parameter pemanggilan
      const activeOrigin = origin || (container.has('request') ? new URL(container.resolve('request').url).origin : null);

      // Panggil sistem transkripsi cerdas asinkron/sinkron
      const transcriptResult = await fetchYoutubeTranscript(
        incomingText, 
        env, 
        update.chatId, 
        update.userId, 
        activeOrigin
      );

      // 🎙️ JALUR SUKSES 1: Jika AssemblyAI Asinkronus Webhook Aktif
      if (transcriptResult && transcriptResult.async) {
        const draft = await sessionManager.get(update.chatId);
        const updatedDraft = draft.copyWith({
          state: WORKFLOW_STATE.WAITING_TRANSCRIPT,
          source: {
            ...draft.source,
            type: 'text',
            text: `[Menunggu Transkrip AssemblyAI Job ID: ${transcriptResult.transcriptId}]`
          }
        });
        await sessionManager.save(updatedDraft);

        // Beritahu wartawan bahwa transkripsi berjalan aman di latar belakang
        return await telegramApi.sendMessage(update.chatId, transcriptResult.message);
      }

      // 🎙️ JALUR SUKSES 2: Jika Menggunakan Scraper Sinkronus Cepat (Fallback)
      const logger = container.resolve(TOKENS.LOGGER);
      logger.info('YouTube transcript fetched successfully via scraper', { chatId: update.chatId });

      const allowedCategories = Object.keys(WORDPRESS_CATEGORY_MAP).join(', ');
      const geminiPrompt = getYoutubePassTemplate(allowedCategories, transcriptResult);

      const aiProvider = container.resolve(TOKENS.AI_PROVIDER);
      
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

      const draft = await sessionManager.get(update.chatId);
      const updatedMultiDraft = draft.copyWith({
        state: WORKFLOW_STATE.WAITING_THEME_SELECTION,
        stage1Multi: result,
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
  // 📝 ALUR DEBOUNCE ANTRIAN NASKAH TEKS BIASA
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

    await QueueManager.add(chatId, update.userId, 'STAGE_1_INGEST', {}, container);
  };

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(processBufferTask());
  } else {
    processBufferTask();
  }
}