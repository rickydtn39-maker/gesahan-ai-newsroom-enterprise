// FILE: src/infrastructure/queue/queue-manager.js

import { TOKENS } from '../../core/container/tokens.js';
import { WORKFLOW_STATE } from '../../core/constants/index.js';
import {
  createAngleKeyboard,
  createReviewKeyboard,
  createStartSelectionKeyboard,
} from '../../application/telegram/keyboards/index.js';

// IMPOR MODUL BARU UNTUK KEPATUHAN HYBRID EDITOR
import { WORDPRESS_CATEGORY_MAP } from '../providers/wordpress/category-map.js';
import { getHybridMetadataTemplate } from '../../application/editorial/prompt/templates/hybrid-metadata-template.js';
import { HYBRID_RESPONSE_SCHEMA } from '../../application/editorial/schema/hybrid-response-schema.js';

const QUEUE_KEY = 'newsroom:global_queue';
const MAX_LOCK_TIME_MS = 2 * 60 * 1000; // Proteksi antrean macet (2 Menit)

function escapeMarkdown(text) {
  if (!text) return '';
  return text.toString().replace(/[_*`[\]]/g, '\\$&');
}

export class QueueManager {
  // 🚀 STATIC HELPER UNTUK PURGE ANTREAN SECARA TOTAL
  static async clearGlobalQueue(container) {
    const kv = container.resolve(TOKENS.DRAFT_REPOSITORY).storage.namespace;
    const logger = container.resolve(TOKENS.LOGGER);

    logger.info('[Queue Manager] Emergency global queue flush executed.');
    await kv.put(QUEUE_KEY, JSON.stringify({ active: null, items: [] }));
  }

  static async add(chatId, userId, taskType, payload, container) {
    const kv = container.resolve(TOKENS.DRAFT_REPOSITORY).storage.namespace;
    const telegramApi = container.resolve(TOKENS.TELEGRAM_API);
    const whitelistRepo = container.resolve(TOKENS.WHITELIST_REPOSITORY);
    const logger = container.resolve(TOKENS.LOGGER);

    const whitelist = await whitelistRepo.getAll();
    const user = whitelist.find((u) => Number(u.userId) === Number(userId));
    const userName = user ? user.name : `Wartawan #${userId}`;

    let queue = await kv.get(QUEUE_KEY, { type: 'json' });
    if (!queue) {
      queue = { active: null, items: [] };
    }

    const now = Date.now();
    const isLockExpired = queue.active && now - queue.active.startedAt > MAX_LOCK_TIME_MS;

    if (!queue.active || isLockExpired) {
      if (isLockExpired) {
        logger.warn(
          'Previous queue lock expired, forcing release, clearing old piled items and executing new task',
          {
            expiredTask: queue.active,
          }
        );
        queue.items = [];
      }

      queue.active = { chatId, userId, userName, taskType, payload, startedAt: now };
      await kv.put(QUEUE_KEY, JSON.stringify(queue));

      const ctx = container.has('ctx') ? container.resolve('ctx') : null;
      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(QueueManager.execute(queue.active, container));
      } else {
        QueueManager.execute(queue.active, container);
      }
    } else {
      queue.items.push({ chatId, userId, userName, taskType, payload, createdAt: now });
      await kv.put(QUEUE_KEY, JSON.stringify(queue));

      const queueNumber = queue.items.length;
      const activeReporter = escapeMarkdown(queue.active.userName);

      await telegramApi.sendMessage(
        chatId,
        [
          '⚠️ *SISTEM ANTREAN NEWSROOM AKTIF*',
          '━━━━━━━━━━━━━━━━━━━━━━━━',
          `Saat ini rekan *${activeReporter}* sedang memproses data ke server AI/WordPress.`,
          '',
          `Anda berada di *antrean nomor #${queueNumber}*.`,
          'Naskah Anda telah aman tersimpan di cloud dan akan diproses secara otomatis jika giliran Anda tiba. Mohon tunggu sejenak...',
          '━━━━━━━━━━━━━━━━━━━━━━━━',
        ].join('\n')
      );
    }
  }

  static async execute(task, container) {
    const telegramApi = container.resolve(TOKENS.TELEGRAM_API);
    const sessionManager = container.resolve(TOKENS.SESSION_MANAGER);
    const logger = container.resolve(TOKENS.LOGGER);

    logger.info('Starting queued task execution', { taskType: task.taskType, userId: task.userId });

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // =========================================================================
      // [A] TASK WORKFLOW AUTOMATIC PIPELINE (DEFAULT)
      // =========================================================================
      if (task.taskType === 'STAGE_1_INGEST') {
        let lockedDraft = await sessionManager.get(task.chatId);
        if (!lockedDraft) {
          logger.warn('STAGE_1_INGEST skipped: draft session not found or cancelled', {
            chatId: task.chatId,
          });
          return;
        }

        if (task.payload?.ocrFileId) {
          await telegramApi.sendMessage(
            task.chatId,
            '🔍 *Giliran Anda Tiba!* Mulai mengunduh dokumen & menjalankan pemindaian OCR...'
          );

          const ocrProvider = container.resolve(TOKENS.OCR_PROVIDER);
          const downloadedFile = await telegramApi.downloadFile(task.payload.ocrFileId);
          const extractedText = await ocrProvider.extractText(
            downloadedFile.buffer,
            downloadedFile.mimeType
          );

          lockedDraft = lockedDraft.copyWith({
            source: {
              ...lockedDraft.source,
              type: 'text',
              text: extractedText,
            },
          });
          await sessionManager.save(lockedDraft);
        }

        await telegramApi.sendMessage(
          task.chatId,
          '⏳ *[STAGE 1] Gemini Reporter* sedang memindai, menganalisis SEO, dan mengklasifikasikan data...'
        );

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

        await telegramApi.sendMessage(
          task.chatId,
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
      } else if (task.taskType === 'STAGE_3_GENERATE') {
        const draft = await sessionManager.get(task.chatId);
        if (!draft) {
          logger.warn('STAGE_3_GENERATE skipped: draft session not found or cancelled', {
            chatId: task.chatId,
          });
          return;
        }

        const editorialService = container.resolve(TOKENS.EDITORIAL_SERVICE);
        const result = await editorialService.generate(draft, draft.stage1);

        const completedDraft = draft.copyWith({
          state: WORKFLOW_STATE.WAITING_REVIEW,
          editorial: result,
        });
        await sessionManager.save(completedDraft);

        const escapedTitle = escapeMarkdown(result.article.title);
        const escapedLead = escapeMarkdown(result.article.lead);
        const escapedSlug = escapeMarkdown(result.seo.slug);
        const escapedKeyword = escapeMarkdown(result.seo.focusKeyword);
        const escapedCategory = escapeMarkdown(result.seo.category);

        await telegramApi.sendMessage(
          task.chatId,
          [
            '✅ *REDAKTUR PELAKSANA DIGITAL SELESAI SUNTING!*',
            '',
            '━━━━━━━━━━━━━━━━━━',
            '',
            '📰 JUDUL',
            '',
            escapedTitle,
            '',
            '━━━━━━━━━━━━━━━━━━',
            '',
            '📝 LEAD',
            '',
            escapedLead,
            '',
            '━━━━━━━━━━━━━━━━━━',
            '',
            '🔍 SEO',
            '',
            `Slug : ${escapedSlug}`,
            `Keyword : ${escapedKeyword}`,
            `Kategori : ${escapedCategory}`,
            '',
            '━━━━━━━━━━━━━━━━━━',
            '',
            '📊 STATISTIK',
            '',
            `Jumlah Kata : ${result.statistics.wordCount}`,
            `Estimasi Baca : ${result.statistics.readingTime} menit`,
            `Editorial Score : ${result.quality.score}/100`,
            '',
            '━━━━━━━━━━━━━━━━━━',
            '',
            '📄 Gunakan tombol "Lihat Artikel Lengkap" untuk membaca hasil penyuntingan.',
            '',
            'Silakan pilih tindakan berikut.',
          ].join('\n'),
          createReviewKeyboard()
        );
      } else if (task.taskType === 'PUBLISH') {
        const draft = await sessionManager.get(task.chatId);
        if (!draft) {
          logger.warn('PUBLISH skipped: draft session not found or cancelled', {
            chatId: task.chatId,
          });
          return;
        }

        const publishingService = container.resolve(TOKENS.PUBLISHING_SERVICE);
        const published = await publishingService.publish(draft);

        const publishDuration = Date.now() - task.startedAt;
        const totalDuration = Date.now() - new Date(draft.createdAt).getTime();

        const metrics = container.resolve(TOKENS.METRICS);

        const analyticsLog = {
          event: 'POST_PUBLISH_ANALYTICS',
          articleId: published.id,
          url: published.url,
          title: draft.editorial.article.title,
          focusKeyword: draft.editorial.seo.focusKeyword,
          newsScore: draft.stage1.newsValue.score,
          priority: draft.stage1.priority,
          ocrConfidence: draft.stage1.confidence.ocrAccuracy || 'N/A',
          wordCount: draft.editorial.statistics.wordCount,
          durationMs: {
            publishing: publishDuration,
            totalWorkflow: totalDuration,
          },
          publishedAt: new Date().toISOString(),
        };

        logger.info('Publishing process successfully completed.', analyticsLog);
        metrics.increment('publishing_completed', 1, { priority: draft.stage1.priority });

        const escapedTitle = escapeMarkdown(draft.editorial.article.title);
        const escapedAuthor = escapeMarkdown(task.userName);
        const escapedCategory = escapeMarkdown(draft.editorial.seo.category);

        const publishReportText = [
          '🚀 *ARTIKEL RESMI TERBIT DI MEDIA NASIONAL!*',
          '━━━━━━━━━━━━━━━━━━',
          `📰 *Judul:* ${escapedTitle}`,
          `✍️ *Penulis:* ${escapedAuthor}`,
          `🏷️ *Kanal:* ${escapedCategory}`,
          `🚨 *Priority:* ${draft.stage1.priority}`,
          `⚡ *Waktu Kerja:* ${Math.ceil(totalDuration / 1000)} detik`,
          '━━━━━━━━━━━━━━━━━━',
          '',
          `🔗 *URL Artikel:* [Klik untuk Membaca](${published.url})`,
          '',
          `🆔 *WP Post ID:* \`${published.id}\``,
          '━━━━━━━━━━━━━━━━━━',
        ].join('\n');

        await sessionManager.cancel(task.chatId);
        await telegramApi.sendMessage(
          task.chatId,
          `${publishReportText}\nSesi draf ini telah ditutup dengan aman. Silakan pilih menu di bawah ini untuk memulai kembali.`,
          createStartSelectionKeyboard()
        );

        const config = container.resolve(TOKENS.CONFIGURATION);
        if (config.telegram.groupChatId) {
          try {
            await telegramApi.sendMessage(config.telegram.groupChatId, publishReportText);
          } catch (groupError) {
            logger.error('Failed to send publish success report to Coordination Group', {
              error: groupError.message,
            });
          }
        }
      }

      // =========================================================================
      // [B] TASK WORKFLOW HYBRID EDITOR (WORKFLOW BARU)
      // =========================================================================
      else if (task.taskType === 'HYBRID_STAGE_3_ANALYZE') {
        const draft = await sessionManager.get(task.chatId);
        if (!draft) {
          logger.warn('HYBRID_STAGE_3_ANALYZE skipped: draft session not found', {
            chatId: task.chatId,
          });
          return;
        }

        await telegramApi.sendMessage(
          task.chatId,
          [
            '🤖 *Gemini sedang melakukan analisis editorial...*',
            '',
            '✔ Analisis struktur',
            '✔ Menentukan kategori',
            '✔ Menentukan SEO',
            '✔ Menentukan metadata',
            '✔ Menyiapkan publikasi',
            '',
            'Mohon tunggu...',
          ].join('\n')
        );

        const aiProvider = container.resolve(TOKENS.AI_PROVIDER);
        const allowedCategories = Object.keys(WORDPRESS_CATEGORY_MAP).join(', ');

        const prompt = getHybridMetadataTemplate(
          allowedCategories,
          draft.hybridTitle,
          draft.hybridBody
        );
        const result = await aiProvider.generate({
          prompt,
          schema: HYBRID_RESPONSE_SCHEMA,
        });

        const updatedDraft = draft.copyWith({
          state: WORKFLOW_STATE.HYBRID_WAITING_IMAGE,
          hybridMetadata: result,
        });
        await sessionManager.save(updatedDraft);

        await telegramApi.sendMessage(
          task.chatId,
          [
            '✅ *ANALISIS EDITORIAL GEMINI SELESAI!*',
            '━━━━━━━━━━━━━━━━━━━━━━━━',
            `🏷️ *Kategori:* ${result.category}`,
            `📁 *Subkategori:* ${result.subcategory}`,
            `🔑 *Focus Keyword:* ${result.focus_keyword}`,
            `🌐 *Slug:* ${result.slug}`,
            `⏱️ *Reading Time:* ${result.reading_time} menit`,
            '━━━━━━━━━━━━━━━━━━━━━━━━',
            '',
            '📸 *LANGKAH TERAKHIR:*',
            'Silakan kirim *Gambar Utama / Featured Image* untuk berita ini:',
          ].join('\n')
        );
      } else if (task.taskType === 'HYBRID_PUBLISH') {
        const draft = await sessionManager.get(task.chatId);
        if (!draft) {
          logger.warn('HYBRID_PUBLISH skipped: draft session not found', {
            chatId: task.chatId,
          });
          return;
        }

        const metadata = draft.hybridMetadata;
        const wordCount = draft.hybridBody.split(/\s+/).filter(Boolean).length;
        const readingTime =
          parseInt(metadata.reading_time, 10) || Math.max(1, Math.ceil(wordCount / 200));

        const standardEditorial = {
          article: {
            title: draft.hybridTitle,
            lead: metadata.excerpt || '',
            content: draft.hybridBody,
            excerpt: metadata.excerpt || '',
          },
          seo: {
            focusKeyword: metadata.focus_keyword,
            metaDescription: metadata.meta_description,
            category: metadata.category,
            tags: metadata.tags || [],
            slug: metadata.slug,
          },
          statistics: {
            wordCount,
            readingTime,
          },
          quality: {
            score: 100,
            notes: ['Terbit aman via Hybrid Editor.'],
          },
        };

        const hydratedDraft = draft.copyWith({
          editorial: standardEditorial,
        });

        const publishingService = container.resolve(TOKENS.PUBLISHING_SERVICE);
        const published = await publishingService.publish(hydratedDraft);

        const totalDuration = Date.now() - new Date(hydratedDraft.createdAt).getTime();
        const metrics = container.resolve(TOKENS.METRICS);

        metrics.increment('publishing_completed', 1, { priority: 'HYBRID' });

        const escapedTitle = escapeMarkdown(hydratedDraft.editorial.article.title);
        const escapedAuthor = escapeMarkdown(task.userName);
        const escapedCategory = escapeMarkdown(hydratedDraft.editorial.seo.category);

        const publishReportText = [
          '🚀 *ARTIKEL RESMI TERBIT VIA HYBRID EDITOR!*',
          '━━━━━━━━━━━━━━━━━━',
          `📰 *Judul:* ${escapedTitle}`,
          `✍️ *Penulis:* ${escapedAuthor}`,
          `🏷️ *Kanal:* ${escapedCategory}`,
          `🚨 *Mode:* Hybrid (Preserve Original Narrative)`,
          `⚡ *Waktu Kerja:* ${Math.ceil(totalDuration / 1000)} detik`,
          '━━━━━━━━━━━━━━━━━━',
          '',
          `🔗 *URL Artikel:* [Klik untuk Membaca](${published.url})`,
          '',
          `🆔 *WP Post ID:* \`${published.id}\``,
          '━━━━━━━━━━━━━━━━━━',
        ].join('\n');

        await sessionManager.cancel(task.chatId);
        await telegramApi.sendMessage(
          task.chatId,
          `${publishReportText}\nSesi Hybrid Anda telah selesai ditutup. Silakan pilih menu di bawah untuk memulai kembali.`,
          createStartSelectionKeyboard()
        );

        const config = container.resolve(TOKENS.CONFIGURATION);
        if (config.telegram.groupChatId) {
          try {
            await telegramApi.sendMessage(config.telegram.groupChatId, publishReportText);
          } catch (groupError) {
            logger.error('Failed to send hybrid publish success report to Coordination Group', {
              error: groupError.message,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error executing task in queue', { task, error: error.message });

      try {
        const activeDraft = await sessionManager.get(task.chatId);
        if (activeDraft) {
          const revertedDraft = activeDraft.copyWith({
            state: WORKFLOW_STATE.IDLE,
          });
          await sessionManager.save(revertedDraft);
        }
      } catch (recoveryError) {
        logger.error('Failed to safely revert draft state on recovery attempt', {
          error: recoveryError.message,
        });
      }

      await telegramApi.sendMessage(
        task.chatId,
        [
          '❌ *BATAS WAKTU SISTEM AI TERLAMPAUI*',
          '━━━━━━━━━━━━━━━━━━━━━━━━',
          `Gagal memproses giliran Anda karena server AI sedang sibuk:`,
          `_${escapeMarkdown(error.message)}_`,
          '',
          '🛡️ *Naskah Anda Tetap Aman!* Sistem berhasil memulihkan draf mentah Anda.',
          'Anda tidak perlu mengirim ulang naskah. Silakan kirim pesan apa saja beberapa saat lagi untuk memicu ulang proses.',
          '━━━━━━━━━━━━━━━━━━━━━━━━',
        ].join('\n'),
        createStartSelectionKeyboard()
      );
    } finally {
      // =========================================================================
      // PENANGANAN PELEPASAN KUNCI & TRANSTRANSFER ANTREAN BERIKUTNYA
      // =========================================================================
      const kv = container.resolve(TOKENS.DRAFT_REPOSITORY).storage.namespace;
      let queue = await kv.get(QUEUE_KEY, { type: 'json' });

      if (queue) {
        if (queue.items.length > 0) {
          const nextTask = queue.items.shift();

          queue.active = {
            ...nextTask,
            startedAt: Date.now(),
          };
          await kv.put(QUEUE_KEY, JSON.stringify(queue));

          await telegramApi.sendMessage(
            nextTask.chatId,
            '🟢 *GILIRAN ANDA DIMULAI!*\n\nSistem kini mulai menganalisis naskah Anda ke server AI. Mohon tunggu...'
          );

          const ctx = container.has('ctx') ? container.resolve('ctx') : null;
          if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(QueueManager.execute(queue.active, container));
          } else {
            QueueManager.execute(queue.active, container);
          }
        } else {
          queue.active = null;
          await kv.put(QUEUE_KEY, JSON.stringify(queue));
          logger.info('Global queue is now empty, lock released.');
        }
      }
    }
  }
}
