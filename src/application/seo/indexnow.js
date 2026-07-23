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
      return { 
        success: false, 
        status: 0, 
        error: 'Configuration Missing', 
        message: 'Key or host is not defined in environment.' 
      };
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
          return { success: true, status: response.status, error: null };
        }

        const errorDetails = this.mapHttpStatus(response.status);
        const errorInstance = new Error(errorDetails);
        errorInstance.status = response.status; // 🚀 Menyimpan status aslinya langsung tanpa parsing string
        throw errorInstance;

      } catch (error) {
        this.logger.warn(`IndexNow submission failed on attempt ${attempt}`, { error: error.message });
        
        if (attempt === maxRetries) {
          const status = error.status || 500;
          return { 
            success: false, 
            status: status, 
            error: this.mapHttpStatus(status) 
          };
        }
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  mapHttpStatus(status) {
    switch (status) {
      case 400:
        return '400 Bad Request (Invalid parameters)';
      case 403:
        return '403 Forbidden (Key/Host mismatch or key.txt not found)';
      case 422:
        return '422 Unprocessable (URL doesn\'t belong to host)';
      case 429:
        return '429 Rate Limited (Too many requests)';
      case 500:
        return '500 Server Error (IndexNow service down)';
      default:
        return `${status || 0} Connection Timeout/Network Error`;
    }
  }
}