// FILE: src/application/seo/monitor.js

export class SeoIndexMonitor {
  constructor(logger, sitemapUrl) {
    this.logger = logger;
    this.sitemapUrl = sitemapUrl;
  }

  async audit(articleUrl) {
    const startTime = Date.now();
    this.logger.info('Starting SEO micro-audit self-crawl', { articleUrl });

    let html = '';
    let httpStatus = 0;

    try {
      const response = await this.fetchWithRetry(articleUrl);
      httpStatus = response.status;
      html = await response.text();
    } catch (error) {
      this.logger.error('SEO self-crawl failed completely', { error: error.message });
      return this.createFailureResult(500, error.message);
    }

    // Ekstraksi Metadata Resilien menggunakan Regular Expressions untuk Cloudflare Workers
    const title = this.extractRegex(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const canonical = this.extractRegex(html, /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) || 
                      this.extractRegex(html, /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
    const metaDesc = this.extractRegex(html, /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      this.extractRegex(html, /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
    const robots = this.extractRegex(html, /<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i);

    // OpenGraph & Twitter Cards
    const ogTags = this.extractMetaProperties(html, 'og:');
    const twitterTags = this.extractMetaNames(html, 'twitter:');

    // JSON-LD Structured Data
    const schemas = this.extractJsonLd(html);
    const hasNewsArticle = schemas.some(s => s['@type'] === 'NewsArticle' || s['@type'] === 'Article' || (Array.isArray(s['@graph']) && s['@graph'].some(g => g['@type'] === 'NewsArticle' || g['@type'] === 'Article')));
    const hasBreadcrumb = schemas.some(s => s['@type'] === 'BreadcrumbList' || (Array.isArray(s['@graph']) && s['@graph'].some(g => g['@type'] === 'BreadcrumbList')));

    // Konten Analisis
    const bodyContent = this.extractRegex(html, /<body[^>]*>([\s\S]*?)<\/body>/i) || html;
    const cleanText = bodyContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Analisis Link & Image
    const links = this.extractLinks(html, articleUrl);
    const images = this.extractImages(html);
    const featuredImageMeta = ogTags['image'] || twitterTags['image'] || null;

    // Sitemap Presence Validation
    const sitemapPresent = await this.verifySitemapPresence(articleUrl);

    this.logger.info('SEO micro-audit self-crawl completed', { durationMs: Date.now() - startTime });

    return {
      httpStatus,
      title,
      canonical,
      metaDescription: metaDesc,
      robots,
      hasNewsArticle,
      hasBreadcrumb,
      openGraph: ogTags,
      twitterCard: twitterTags,
      wordCount,
      readingTime,
      internalLinksCount: links.internal.length,
      externalLinksCount: links.external.length,
      featuredImage: featuredImageMeta,
      hasFeaturedImage: Boolean(featuredImageMeta),
      imagesCount: images.total,
      imagesWithAltCount: images.withAlt,
      imagesMissingAltCount: images.missingAlt,
      sitemapPresent,
    };
  }

  async fetchWithRetry(url, maxRetries = 3) {
    let delay = 1000;
    for (let i = 1; i <= maxRetries; i++) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'GesahanSeoBot/1.0 (Enterprise SEO Auditor)' }
        });
        if (res.ok || res.status < 500) return res;
        throw new Error(`HTTP ${res.status}`);
      } catch (error) {
        if (i === maxRetries) throw error;
        await new Promise(r => setTimeout(res, delay));
        delay *= 2;
      }
    }
  }

  extractRegex(html, regex) {
    const match = html.match(regex);
    return match ? match[1].trim() : '';
  }

  extractMetaProperties(html, prefix) {
    const regex = /<meta[^>]*property=["']([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
    const results = {};
    let match;
    while ((match = regex.exec(html)) !== null) {
      const prop = match[1];
      if (prop.startsWith(prefix)) {
        results[prop.replace(prefix, '')] = match[2].trim();
      }
    }
    return results;
  }

  extractMetaNames(html, prefix) {
    const regex = /<meta[^>]*name=["']([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
    const results = {};
    let match;
    while ((match = regex.exec(html)) !== null) {
      const name = match[1];
      if (name.startsWith(prefix)) {
        results[name.replace(prefix, '')] = match[2].trim();
      }
    }
    return results;
  }

  extractJsonLd(html) {
    const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const schemas = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        schemas.push(JSON.parse(match[1].trim()));
      } catch (_e) {
        // Ignored invalid JSON script blocks
      }
    }
    return schemas;
  }

  extractLinks(html, currentUrl) {
    const host = new URL(currentUrl).hostname;
    const regex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    const links = { internal: [], external: [] };
    let match;
    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      if (href.startsWith('/') || href.startsWith('#') || href.includes(host)) {
        links.internal.push(href);
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        links.external.push(href);
      }
    }
    return links;
  }

  extractImages(html) {
    const regex = /<img([^>]+)>/gi;
    let total = 0;
    let withAlt = 0;
    let missingAlt = 0;
    let match;

    while ((match = regex.exec(html)) !== null) {
      total++;
      const attrs = match[1];
      const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
      if (altMatch && altMatch[1].trim().length > 0) {
        withAlt++;
      } else {
        missingAlt++;
      }
    }

    return { total, withAlt, missingAlt };
  }

  async verifySitemapPresence(articleUrl) {
    if (!this.sitemapUrl) return false;
    
    try {
      // 🚀 Deteksi otomatis post sitemap URL dari sitemap utama WordPress
      const sitemapTarget = this.sitemapUrl.replace('sitemap_index.xml', 'post-sitemap.xml');
      const response = await fetch(sitemapTarget);
      if (!response.ok) return false;
      
      const xml = await response.text();
      return xml.includes(articleUrl);
    } catch (_e) {
      return false;
    }
  }

  createFailureResult(status, errorMsg) {
    return {
      httpStatus: status,
      title: '',
      canonical: '',
      metaDescription: '',
      robots: '',
      hasNewsArticle: false,
      hasBreadcrumb: false,
      openGraph: {},
      twitterCard: {},
      wordCount: 0,
      readingTime: 0,
      internalLinksCount: 0,
      externalLinksCount: 0,
      featuredImage: null,
      hasFeaturedImage: false,
      imagesCount: 0,
      imagesWithAltCount: 0,
      imagesMissingAltCount: 0,
      sitemapPresent: false,
      error: errorMsg,
    };
  }
}