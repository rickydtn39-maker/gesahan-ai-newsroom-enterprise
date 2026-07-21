// FILE: src/application/seo/validator.js

export class SeoValidator {
  validate(auditResult, originalUrl) {
    const validations = {
      httpStatus: auditResult.httpStatus === 200,
      canonical: auditResult.canonical === originalUrl,
      titleLength: auditResult.title.length >= 50 && auditResult.title.length <= 65,
      metaDescLength: auditResult.metaDescription.length >= 120 && auditResult.metaDescription.length <= 160,
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
    if (!validations.titleLength) warnings.push(`SEO Title too ${auditResult.title.length < 50 ? 'short' : 'long'} (${auditResult.title.length} chars). Ideal: 50-65.`);
    if (!validations.metaDescLength) warnings.push(`Meta Description length is ${auditResult.metaDescription.length} chars. Ideal: 120-160.`);
    if (!validations.robotsValid) warnings.push(`Robots tags prevent indexing: "${auditResult.robots || 'None'}"`);
    if (!validations.hasSchema) warnings.push('Missing NewsArticle/Article Schema JSON-LD markup.');
    if (!validations.hasFeaturedImage) warnings.push('Featured Image (og:image) is not defined.');
    if (auditResult.imagesMissingAltCount > 0) warnings.push(`Alt tags are missing on ${auditResult.imagesMissingAltCount} image(s).`);
    if (!validations.wordCountValid) warnings.push(`Word count is low (${auditResult.wordCount} words). Ideal: >500.`);
    if (!validations.internalLinksValid) warnings.push('Internal linking count is 0. Link other relevant posts.');

    return {
      isValid: Object.values(validations).every(Boolean),
      validations,
      warnings,
    };
  }
}