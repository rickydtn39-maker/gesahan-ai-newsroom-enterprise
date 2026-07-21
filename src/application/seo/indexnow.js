// FILE: src/application/seo/indexnow.js

export class IndexNowService {
  constructor(logger, indexNowKey, sitemapUrl) {
    this.logger = logger;
    this.indexNowKey = indexNowKey;
    this.sitemapUrl = sitemapUrl;
  }

  async submit(articleUrl) {
    if (!this.indexNowKey || !this.sitemapUrl) {
      this.logger.warn('IndexNow skipped: key or host is not configured.');
      return { success: false, status: 0, error: 'CONFIG_MISSING' };
    }

    const host = new URL(this.sitemapUrl).hostname;
    const url = 'https://api.indexnow.org/indexnow';
    const payload = {
      host: host,
      key: this.indexNowKey,
      keyLocation: `https://${host}/${this.indexNowKey}.txt`,
      urlList: [articleUrl],
    };

    const maxRetries = 3;
    let delay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`Sending IndexNow request (Attempt ${attempt}/${maxRetries})`, { articleUrl });
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          this.logger.info('IndexNow submission successful', { articleUrl, status: response.status });
          return { success: true, status: response.status };
        }

        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        this.logger.warn(`IndexNow submission failed on attempt ${attempt}`, { error: error.message });
        if (attempt === maxRetries) {
          return { success: false, status: 500, error: error.message };
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
}