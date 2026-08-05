// FILE: src/infrastructure/queue/queue-manager.js

import { TOKENS } from '../../core/container/tokens.js';
import { WORKFLOW_STATE } from '../../core/constants/index.js';
import { createMainKeyboard } from '../../application/telegram/keyboards/index.js';

// IMPOR UNTUK METODE HYBRID EDITOR
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
  // STATIC HELPER UNTUK PURGE ANTREAN SECARA TOTAL
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
        logger.warn('Previous queue lock expired, forcing release, clearing old piled items and executing new task', {
          expiredTask: queue.active,
        });
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
      // TASK WORKFLOW HYBRID EDITOR (SINGLE WORKFLOW SYSTEM)
      // =========================================================================
      if (task.taskType === 'HYBRID_STAGE_3_ANALYZE') {
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
            'Mohon tunggu...'
          ].join('\n')
        );

        const aiProvider = container.resolve(TOKENS.AI_PROVIDER);
        const allowedCategories = Object.keys(WORDPRESS_CATEGORY_MAP).join(', ');

        const prompt = getHybridMetadataTemplate(allowedCategories, draft.hybridTitle, draft.hybridBody);
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
            'Silakan kirim *Gambar Utama / Featured Image* untuk berita ini:'
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
        const readingTime = parseInt(metadata.reading_time, 10) || Math.max(1, Math.ceil(wordCount / 200));

        // Membelah hybridBody secara dinamis. Paragraf 1 naskah asli menjadi "lead", Paragraf 2..N menjadi "content".
        const paragraphs = draft.hybridBody.split(/\r?\n\r?\n/).map(p => p.trim()).filter(Boolean);
        const lead = paragraphs[0] || '';
        const content = paragraphs.slice(1).join('\n\n');

        const standardEditorial = {
          article: {
            title: draft.hybridTitle,
            lead: lead,
            content: content,
            excerpt: metadata.excerpt || lead,
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
          }
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
          createMainKeyboard()
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
        createMainKeyboard()
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