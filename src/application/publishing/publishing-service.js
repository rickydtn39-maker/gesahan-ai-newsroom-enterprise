// FILE: src/application/publishing/publishing-service.js

import { decryptText } from '../../core/security/crypto.js';

export class PublishingService {
  constructor(
    telegramApi,
    wordpressProvider,
    whitelistRepository,
    eventBus,
    logger,
    metrics,
    draftRepository,
    config
  ) {
    this.telegramApi = telegramApi;
    this.wordpressProvider = wordpressProvider;
    this.whitelistRepository = whitelistRepository;
    this.eventBus = eventBus;
    this.logger = logger;
    this.metrics = metrics;
    this.draftRepository = draftRepository;
    this.config = config; // 🚀 Menyimpan global config
  }

  async publish(draft) {
    const startTime = Date.now();
    this.logger.info('Starting publishing process', { draftId: draft.id });

    try {
      if (!draft.source || !draft.source.featuredImage) {
        throw new Error('Foto unggulan (Featured Image) belum tersedia.');
      }

      const featured = draft.source.featuredImage;

      // 1. Deteksi dinamis kredensial Multi-Author dari whitelist KV
      const whitelist = await this.whitelistRepository.getAll();
      const userCredentials = whitelist.find((u) => Number(u.userId) === Number(draft.userId));

      let customAuth = null;
      if (userCredentials && userCredentials.wpUsername && userCredentials.wpAppPassword) {
        // 🚀 DECRYPT PASSWORD MENGGUNAKAN KUNCI CONFIG AMAN (AES-GCM)
        const decryptedPassword = await decryptText(
          userCredentials.wpAppPassword,
          this.config.application.encryptionSecret
        );

        customAuth = {
          username: userCredentials.wpUsername,
          applicationPassword: decryptedPassword,
        };
        this.logger.info('Using custom secure author credentials for WordPress publishing', {
          userId: draft.userId,
          wpUsername: userCredentials.wpUsername,
        });
      } else {
        this.logger.info('Falling back to global WordPress Admin credentials', {
          userId: draft.userId,
        });
      }

      // 2. Download Foto Telegram
      const file = await this.telegramApi.downloadFile(featured.fileId);

      // 3. Upload Media WordPress menggunakan dynamic auth
      const media = await this.wordpressProvider.uploadMedia(
        file.fileName,
        file.mimeType,
        file.buffer,
        customAuth
      );

      // 4. Create Post menggunakan dynamic auth
      const post = await this.wordpressProvider.createPost(draft.editorial, media.id, customAuth);

      // 5. EVENT BUS DECOUPLING: Kirim sinyal bahwa artikel sukses diterbitkan
      try {
        const articleUrl = post.link;
        await this.eventBus.publish('ARTICLE_PUBLISHED', {
          articleUrl,
          postId: post.id,
          draftId: draft.id,
          editorial: draft.editorial,
          chatId: draft.chatId, // 🚀 BARIS KUNCI: Kirim Chat ID agar Telegram SEO Report tahu tujuan pengiriman!
        });
      } catch (eventError) {
        this.logger.error('Error triggering ARTICLE_PUBLISHED event subscribers', {
          error: eventError.message,
        });
      }

      // 6. ARCHIVE MEMORY LEWAT METHOD RESMI REPOSITORI
      try {
        await this.draftRepository.archiveDraftMemory(post.id, {
          id: post.id,
          title: draft.editorial.article.title,
          category: draft.editorial.seo.category,
          keyword: draft.editorial.seo.focusKeyword,
          url: post.link,
        });
      } catch (archError) {
        this.logger.error('Failed to archive draft into repository memory', {
          error: archError.message,
        });
      }

      const duration = Date.now() - startTime;
      this.logger.info('Publishing completed successfully', {
        draftId: draft.id,
        wpPostId: post.id,
      });
      this.metrics.timing('publishing_duration', duration, { status: 'success' });
      this.metrics.increment('articles_published', 1, { category: draft.editorial.seo.category });

      return {
        id: post.id,
        url: post.link,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Publishing failed', { draftId: draft.id, error: error.message });
      this.metrics.timing('publishing_duration', duration, { status: 'error' });
      this.metrics.increment('publishing_errors', 1);
      throw error;
    }
  }
}
