import { WORDPRESS_CATEGORY_MAP } from './category-map.js';

export class WordPressProvider {
  constructor(configuration) {
    this.endpoint = configuration.wordpress.endpoint;
    this.username = configuration.wordpress.username;
    this.applicationPassword = configuration.wordpress.applicationPassword;
  }

  get authorization() {
    const credentials = `${this.username}:${this.applicationPassword}`;
    return `Basic ${btoa(credentials)}`;
  }

  async uploadMedia(fileName, mimeType, buffer) {
    const response = await fetch(`${this.endpoint}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        Authorization: this.authorization,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': mimeType
      },
      body: buffer
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? 'Failed to upload media.');
    }

    return payload;
  }

  async createTags(tags = []) {
    const ids = [];

    for (const tag of tags) {
      try {
        const search = await fetch(
          `${this.endpoint}/wp-json/wp/v2/tags?search=${encodeURIComponent(tag)}`,
          {
            headers: {
              Authorization: this.authorization
            }
          }
        );

        const existing = await search.json();

        if (Array.isArray(existing) && existing.length > 0) {
          ids.push(existing[0].id);
          continue;
        }

        const created = await fetch(`${this.endpoint}/wp-json/wp/v2/tags`, {
          method: 'POST',
          headers: {
            Authorization: this.authorization,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: tag
          })
        });

        if (created.ok) {
          const createdPayload = await created.json();
          ids.push(createdPayload.id);
        }
      } catch (_error) {
        continue;
      }
    }

    return ids;
  }

  async createPost(editorial, mediaId) {
    const tagIds = await this.createTags(editorial.seo.tags);

    const categoryName = editorial.seo.category ? editorial.seo.category.toUpperCase() : 'BERITA';
    const categoryId = WORDPRESS_CATEGORY_MAP[categoryName] ?? 1;

    // Premium Layout: Menjadikan lead tercetak tebal (bold) di awal artikel
    const finalHtmlContent = `<strong>${editorial.article.lead}</strong>\n\n${editorial.article.content}`;

    const response = await fetch(`${this.endpoint}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        Authorization: this.authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: editorial.article.title,
        content: finalHtmlContent,
        excerpt: editorial.article.lead,
        slug: editorial.seo.slug,
        featured_media: mediaId,
        categories: [categoryId],
        tags: tagIds,
        status: 'publish',

        // =========================================================================
        // 🚀 INTEGRASI METADATA YOAST SEO (Otomatis Mengisi Yoast SEO)
        // =========================================================================
        meta: {
          _yoast_wpseo_focuskw: editorial.seo.focusKeyword || '',
          _yoast_wpseo_metadesc: editorial.seo.metaDescription || ''
        }
        // =========================================================================
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? 'Failed to publish article.');
    }

    return payload;
  }
}