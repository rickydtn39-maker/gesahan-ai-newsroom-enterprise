export class PublishingService {
  constructor(telegramApi, wordpressProvider, logger, metrics) {
    this.telegramApi = telegramApi;
    this.wordpressProvider = wordpressProvider;
    this.logger = logger;
    this.metrics = metrics;
  }

  async publish(draft) {
    const startTime = Date.now();
    this.logger.info('Starting publishing process', { draftId: draft.id });

    try {
      if (!draft.source || !draft.source.featuredImage) {
        throw new Error('Foto unggulan (Featured Image) belum tersedia.');
      }

      const featured = draft.source.featuredImage;

      // 1. Download Foto Telegram
      const file = await this.telegramApi.downloadFile(featured.fileId);

      // 2. Upload Media WordPress
      const media = await this.wordpressProvider.uploadMedia(
        file.fileName,
        file.mimeType,
        file.buffer
      );

      // 3. Create Post
      const post = await this.wordpressProvider.createPost(draft.editorial, media.id);

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
