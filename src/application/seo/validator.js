// FILE: src/application/seo/validator.js

export class SeoValidator {
  validate(auditResult, originalUrl) {
    const validations = {
      httpStatus: auditResult.httpStatus === 200,
      canonical: auditResult.canonical === originalUrl,
      titleLength: auditResult.title.length >= 40 && auditResult.title.length <= 115,
      // 🚀 PENYEMPURNAAN ATURAN: Melonggarkan batas atas meta deskripsi menjadi 240 karakter
      metaDescLength:
        auditResult.metaDescription.length >= 100 && auditResult.metaDescription.length <= 240,
      robotsValid: auditResult.robots.includes('index') && auditResult.robots.includes('follow'),
      hasSchema: auditResult.hasNewsArticle,
      hasBreadcrumb: auditResult.hasBreadcrumb,
      hasOpenGraph: Boolean(
        auditResult.openGraph.title &&
        auditResult.openGraph.image &&
        auditResult.openGraph.description
      ),
      hasTwitterCard: Boolean(auditResult.twitterCard.title || auditResult.twitterCard.card),
      hasFeaturedImage: auditResult.hasFeaturedImage,
      altTagsValid: auditResult.imagesCount === 0 || auditResult.imagesMissingAltCount === 0,
      wordCountValid: auditResult.wordCount >= 500,
      internalLinksValid: auditResult.internalLinksCount > 0,
    };

    const warnings = [];
    if (!validations.httpStatus)
      warnings.push(`HTTP status is ${auditResult.httpStatus}. Expected 200 OK.`);
    if (!validations.canonical)
      warnings.push('Canonical URL mismatch with the published post address.');
    if (!validations.titleLength)
      warnings.push(
        `SEO Title too ${auditResult.title.length < 40 ? 'short' : 'long'} (${auditResult.title.length} chars). Ideal: 40-115.`
      );
    if (!validations.metaDescLength)
      warnings.push(
        `Meta Description length is ${auditResult.metaDescription.length} chars. Ideal: 100-240.`
      );
    if (!validations.robotsValid)
      warnings.push(`Robots tags prevent indexing: "${auditResult.robots || 'None'}"`);
    if (!validations.hasSchema) warnings.push('Missing NewsArticle/Article Schema JSON-LD markup.');
    if (!validations.hasFeaturedImage) warnings.push('Featured Image (og:image) is not defined.');
    if (auditResult.imagesMissingAltCount > 0)
      warnings.push(
        `Alt tags are missing on ${auditResult.imagesMissingAltCount} image(s) inside post content.`
      );
    if (!validations.wordCountValid)
      warnings.push(`Word count is low (${auditResult.wordCount} words). Ideal: >500.`);
    if (!validations.internalLinksValid)
      warnings.push('Internal linking count is 0. Link other relevant posts.');

    return {
      isValid: Object.values(validations).every(Boolean),
      validations,
      warnings,
    };
  }
}
