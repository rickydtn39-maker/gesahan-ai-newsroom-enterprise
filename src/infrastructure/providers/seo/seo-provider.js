export class SeoProvider {
  constructor(configuration, logger) {
    this.sitemapUrl = configuration.seo.sitemapUrl;
    this.rssUrl = configuration.seo.rssUrl;
    this.indexNowKey = configuration.seo.indexNowKey;
    this.logger = logger;
  }

  async submitToIndexNow(articleUrl) {
    if (!this.indexNowKey || !this.sitemapUrl) {
      this.logger.warn('IndexNow submission skipped: key or host is not configured.');
      return;
    }

    try {
      const host = new URL(this.sitemapUrl).hostname;
      const url = 'https://api.indexnow.org/indexnow';

      const payload = {
        host: host,
        key: this.indexNowKey,
        keyLocation: `https://${host}/${this.indexNowKey}.txt`,
        urlList: [articleUrl],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.logger.info('IndexNow submission successful', { articleUrl });
    } catch (error) {
      this.logger.error('IndexNow submission failed', { error: error.message });
    }
  }

  async pingSitemap() {
    if (!this.sitemapUrl) {
      this.logger.warn('Sitemap ping skipped: sitemap URL is not configured.');
      return;
    }

    try {
      const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(this.sitemapUrl)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.logger.info('Sitemap ping to Bing successful');
    } catch (error) {
      this.logger.error('Sitemap ping to Bing failed', { error: error.message });
    }
  }

  async pingRssFeed() {
    if (!this.rssUrl) {
      this.logger.warn('RSS ping skipped: RSS URL is not configured.');
      return;
    }

    try {
      const url = 'https://pubsubhubbub.appspot.com/publish';
      const body = new URLSearchParams();
      body.append('hub.mode', 'publish');
      body.append('hub.url', this.rssUrl);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.logger.info('RSS WebSub ping to Google Hub successful');
    } catch (error) {
      this.logger.error('RSS WebSub ping to Google Hub failed', { error: error.message });
    }
  }
}
