// FILE: src/application/seo/validator.js

export class SeoValidator {
  validate(auditResult, originalUrl) {
    const validations = {
      httpStatus: auditResult.httpStatus === 200,
      canonical: auditResult.canonical === originalUrl,
      // 🚀 ATURAN BARU: Toleransi panjang judul dilonggarkan menjadi 40 - 95 karakter
      titleLength: auditResult.title.length >= 40 && auditResult.title.length <= 95,
      // 🚀 ATURAN BARU: Toleransi deskripsi meta dilonggarkan menjadi 100 - 200 karakter
      metaDescLength: auditResult.metaDescription.length >= 100 && auditResult.metaDescription.length <= 200,
      robotsValid: auditResult.robots.includes('index') && auditResult.robots.includes('follow'),
      hasSchema: auditResult.hasNewsArticle,
      hasBreadcrumb: auditResult.hasBreadcrumb,
      hasOpenGraph: Boolean(auditResult.openGraph.title && auditResult.openGraph.image && auditResult.openGraph.description),
      hasTwitterCard: Boolean(auditResult.twitterCard.title || auditResult.twitterCard.card),
      hasFeaturedImage: auditResult.hasFeaturedImage,
      altTagsValid: auditResult.imagesCount === 0 || auditResult.imagesMissingAltCount === 0,
      wordCountValid: auditResult.wordCount >= 500,
      internalLinksValid: auditResult.internalLinksCount > 0,
    };

    const warnings = [];
    if (!validations.httpStatus) warnings.push(`HTTP status is ${auditResult.httpStatus}. Expected 200 OK.`);
    if (!validations.canonical) warnings.push('Canonical URL mismatch with the published post address.');
    if (!validations.titleLength) warnings.push(`SEO Title too ${auditResult.title.length < 40 ? 'short' : 'long'} (${auditResult.title.length} chars). Ideal: 40-95.`);
    if (!validations.metaDescLength) warnings.push(`Meta Description length is ${auditResult.metaDescription.length} chars. Ideal: 100-200.`);
    if (!validations.robotsValid) warnings.push(`Robots tags prevent indexing: "${auditResult.robots || 'None'}"`);
    if (!validations.hasSchema) warnings.push('Missing NewsArticle/Article Schema JSON-LD markup.');
    if (!validations.hasFeaturedImage) warnings.push('Featured Image (og:image) is not defined.');
    if (auditResult.imagesMissingAltCount > 0) warnings.push(`Alt tags are missing on ${auditResult.imagesMissingAltCount} image(s) inside post content.`);
    if (!validations.wordCountValid) warnings.push(`Word count is low (${auditResult.wordCount} words). Ideal: >500.`);
    if (!validations.internalLinksValid) warnings.push('Internal linking count is 0. Link other relevant posts.');

    return {
      isValid: Object.values(validations).every(Boolean),
      validations,
      warnings,
    };
  }
}