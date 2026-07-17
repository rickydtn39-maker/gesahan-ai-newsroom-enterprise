export class PublishingService {
  constructor(
    telegramApi,
    wordpressProvider
  ) {
    this.telegramApi = telegramApi;
    this.wordpressProvider =
      wordpressProvider;
  }

  async publish(draft) {
    const featured =
      draft.source.featuredImage;

    const file =
      await this.telegramApi.downloadFile(
        featured.fileId
      );

    const media =
      await this.wordpressProvider.uploadMedia(
        file.fileName,
        file.mimeType,
        file.buffer
      );

    const post =
      await this.wordpressProvider.createPost(
        draft.editorial,
        media.id
      );

    return {
      id: post.id,
      url: post.link
    };
  }
}