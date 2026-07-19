import { WORDPRESS_CATEGORY_MAP } from './category-map.js';

export class WordPressProvider {
  constructor(configuration) {
    this.endpoint = configuration.wordpress.endpoint;
    this.username = configuration.wordpress.username;
    this.applicationPassword = configuration.wordpress.applicationPassword;
  }

  getAuthorization(customAuth = null) {
    const username = customAuth?.username || this.username;
    const password = customAuth?.applicationPassword || this.applicationPassword;
    const credentials = `${username}:${password}`;
    return `Basic ${btoa(credentials)}`;
  }

  async uploadMedia(fileName, mimeType, buffer, customAuth = null) {
    const response = await fetch(`${this.endpoint}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthorization(customAuth),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': mimeType,
      },
      body: buffer,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? 'Failed to upload media.');
    }

    return payload;
  }

  async createTags(tags = [], customAuth = null) {
    if (!tags || tags.length === 0) return [];

    // 🚀 HIGH PERFORMANCE PARALLEL TAG PROCESSING
    const tagPromises = tags.map(async (tag) => {
      try {
        const search = await fetch(
          `${this.endpoint}/wp-json/wp/v2/tags?search=${encodeURIComponent(tag)}`,
          {
            headers: {
              Authorization: this.getAuthorization(customAuth),
            },
          }
        );

        const existing = await search.json();

        if (Array.isArray(existing) && existing.length > 0) {
          return existing[0].id;
        }

        const created = await fetch(`${this.endpoint}/wp-json/wp/v2/tags`, {
          method: 'POST',
          headers: {
            Authorization: this.getAuthorization(customAuth),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: tag }),
        });

        if (created.ok) {
          const createdPayload = await created.json();
          return createdPayload.id;
        }
      } catch (_error) {
        return null;
      }
      return null;
    });

    const results = await Promise.all(tagPromises);
    return results.filter((tagId) => tagId !== null);
  }

  async createPost(editorial, mediaId, customAuth = null) {
    const tagIds = await this.createTags(editorial.seo.tags, customAuth);

    const categoryName = editorial.seo.category ? editorial.seo.category.toUpperCase() : 'BERITA';
    const categoryId = WORDPRESS_CATEGORY_MAP[categoryName] ?? 1;

    // 🔄 PARSER RESILIEN MULTILINE
    const formattedContent = editorial.article.content
      .replace(/^####\s+(.+?)\r?$/gm, '<h4>$1</h4>')
      .replace(/^###\s+(.+?)\r?$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.+?)\r?$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.+?)\r?$/gm, '<h1>$1</h1>');

    const finalHtmlContent = `<strong>${editorial.article.lead}</strong>\n\n${formattedContent}`;

    const response = await fetch(`${this.endpoint}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthorization(customAuth),
        'Content-Type': 'application/json',
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
        meta: {
          _yoast_wpseo_focuskw: editorial.seo.focusKeyword || '',
          _yoast_wpseo_metadesc: editorial.seo.metaDescription || '',
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? 'Failed to publish article.');
    }

    return payload;
  }
}
