// FILE: src/infrastructure/providers/wordpress/wordpress-provider.js

import { WORDPRESS_CATEGORY_MAP } from './category-map.js';

export class WordPressProvider {
  constructor(configuration) {
    this.endpoint = configuration.wordpress.endpoint
      ? configuration.wordpress.endpoint.replace(/\/+$/, '')
      : '';
    this.username = configuration.wordpress.username;
    this.applicationPassword = configuration.wordpress.applicationPassword;
  }

  getAuthorization(customAuth = null) {
    const username = customAuth?.username || this.username;
    const password = customAuth?.applicationPassword || this.applicationPassword;
    const credentials = `${username}:${password}`;
    return `Basic ${btoa(credentials)}`;
  }

  async uploadMedia(fileName, mimeType, buffer, metadata = null, customAuth = null) {
    // 1. Unggah berkas biner media ke WordPress
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

    // 2. 🚀 RESILIENT METADATA UPDATE ENRICHMENT (Alt, Title, Caption, Description)
    // Jika data metadata dilewatkan, lakukan update asinkron ke objek media yang baru dibuat
    if (metadata && payload.id) {
      try {
        const updateResponse = await fetch(`${this.endpoint}/wp-json/wp/v2/media/${payload.id}`, {
          method: 'POST',
          headers: {
            Authorization: this.getAuthorization(customAuth),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: metadata.title || '',
            alt_text: metadata.altText || '',
            caption: metadata.caption || '',
            description: metadata.description || '',
          }),
        });

        if (updateResponse.ok) {
          const updatedPayload = await updateResponse.json();
          return updatedPayload;
        }
      } catch (err) {
        // Non-blocking: Jika proses update metadata gagal, postingan tetap berjalan menggunakan payload asli
        console.error('Failed to update media details metadata:', err.message);
      }
    }

    return payload;
  }

  async resolveCategory(categoryName, customAuth = null) {
    if (!categoryName) return 1; // Default fallback ke ID Berita (1)

    const trimmedCategory = categoryName.trim();
    try {
      // Cari kategori case-insensitive berdasarkan nama teks ke REST API WordPress
      const search = await fetch(
        `${this.endpoint}/wp-json/wp/v2/categories?search=${encodeURIComponent(trimmedCategory)}`,
        {
          headers: {
            Authorization: this.getAuthorization(customAuth),
          },
        }
      );

      const existing = await search.json();

      if (Array.isArray(existing) && existing.length > 0) {
        // Cari kecocokan presisi 100%
        const exactMatch = existing.find(
          (c) => c.name.toLowerCase() === trimmedCategory.toLowerCase()
        );
        if (exactMatch) {
          return exactMatch.id;
        }
      }

      // 🚀 Jika belum terdaftar di WordPress, buat kategori tersebut secara dinamis
      const created = await fetch(`${this.endpoint}/wp-json/wp/v2/categories`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthorization(customAuth),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedCategory }),
      });

      if (created.ok) {
        const createdPayload = await created.json();
        return createdPayload.id;
      } else {
        const createdPayload = await created.json();
        if (createdPayload.code === 'term_exists') {
          return createdPayload.data.term_id;
        }
      }
    } catch (_error) {
      // Fallback ke map statis jika koneksi WordPress terganggu
      return WORDPRESS_CATEGORY_MAP[trimmedCategory.toUpperCase()] ?? 1;
    }

    return 1;
  }

  async createTags(tags = [], customAuth = null) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) return [];

    const tagPromises = tags.map(async (tag) => {
      const trimmedTag = tag.trim();
      try {
        const search = await fetch(
          `${this.endpoint}/wp-json/wp/v2/tags?search=${encodeURIComponent(trimmedTag)}`,
          {
            headers: {
              Authorization: this.getAuthorization(customAuth),
            },
          }
        );

        const existing = await search.json();

        if (Array.isArray(existing) && existing.length > 0) {
          const exactMatch = existing.find(
            (t) => t.name.toLowerCase() === trimmedTag.toLowerCase()
          );
          if (exactMatch) {
            return exactMatch.id;
          }
        }

        const created = await fetch(`${this.endpoint}/wp-json/wp/v2/tags`, {
          method: 'POST',
          headers: {
            Authorization: this.getAuthorization(customAuth),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: trimmedTag }),
        });

        if (created.ok) {
          const createdPayload = await created.json();
          return createdPayload.id;
        } else {
          const createdPayload = await created.json();
          if (createdPayload.code === 'term_exists') {
            return createdPayload.data.term_id;
          }
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

    // 🚀 STABILISASI KATEGORI UTAMA TUNGGAL:
    // Dapatkan ID kategori dinamis berdasarkan nama kategori murni hasil klasifikasi AI
    const categoryId = await this.resolveCategory(editorial.seo.category, customAuth);

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
        excerpt: editorial.article.excerpt || editorial.article.lead,
        slug: editorial.seo.slug,
        featured_media: mediaId,
        categories: [categoryId], // 🚀 Kunci mutlak hanya mengirim satu ID kategori utama tunggal
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