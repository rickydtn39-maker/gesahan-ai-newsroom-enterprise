import { WORDPRESS_CATEGORY_MAP } from '../../../infrastructure/providers/wordpress/category-map.js';

export class EditorialValidator {
  validate(result) {
    if (!result) {
      throw new Error('Hasil Editorial Engine kosong atau tidak valid.');
    }

    const { article, seo } = result;

    if (!article || typeof article !== 'object') {
      throw new Error('Struktur tidak valid: Objek "article" tidak ditemukan.');
    }

    if (!seo || typeof seo !== 'object') {
      throw new Error('Struktur tidak valid: Objek "seo" tidak ditemukan.');
    }

    // 1. Validasi mendalam untuk field wajib Article
    if (typeof article.title !== 'string' || article.title.trim().length === 0) {
      throw new Error('Validasi gagal: "article.title" wajib diisi berupa teks.');
    }

    if (typeof article.lead !== 'string' || article.lead.trim().length === 0) {
      throw new Error('Validasi gagal: "article.lead" wajib diisi berupa teks.');
    }

    if (typeof article.content !== 'string' || article.content.trim().length === 0) {
      throw new Error('Validasi gagal: "article.content" wajib diisi berupa teks.');
    }

    // 2. Validasi mendalam untuk field wajib SEO
    if (typeof seo.focusKeyword !== 'string' || seo.focusKeyword.trim().length === 0) {
      throw new Error('Validasi gagal: "seo.focusKeyword" wajib diisi berupa teks.');
    }

    if (typeof seo.metaDescription !== 'string' || seo.metaDescription.trim().length === 0) {
      throw new Error('Validasi gagal: "seo.metaDescription" wajib diisi berupa teks.');
    }

    if (typeof seo.category !== 'string' || seo.category.trim().length === 0) {
      throw new Error('Validasi gagal: "seo.category" wajib diisi berupa teks.');
    }

    // Validasi kecocokan Kategori secara dinamis dengan Whitelist Map
    const categoryUpper = seo.category.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(WORDPRESS_CATEGORY_MAP, categoryUpper)) {
      throw new Error(`Validasi gagal: Kategori "${seo.category}" tidak terdaftar dalam konfigurasi category-map.js.`);
    }

    if (!Array.isArray(seo.tags)) {
      throw new Error('Validasi gagal: "seo.tags" wajib berupa array list.');
    }

    seo.tags.forEach((tag, idx) => {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        throw new Error(`Validasi gagal: Tag pada indeks [${idx}] wajib berupa teks non-kosong.`);
      }
    });

    return result;
  }
}