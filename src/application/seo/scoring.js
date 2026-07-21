// FILE: src/application/seo/scoring.js

export class SeoScoring {
  calculate(auditResult, indexNowSuccess, validation) {
    let score = 0;

    // 10 Points each for 10 structural SEO categories (Total: 100)
    if (validation.validations.httpStatus) score += 10;
    if (auditResult.sitemapPresent) score += 10;
    if (validation.validations.canonical) score += 10;
    if (validation.validations.metaDescLength) score += 10;
    if (validation.validations.hasSchema) score += 10;
    if (validation.validations.hasFeaturedImage) score += 10;
    if (validation.validations.altTagsValid) score += 10;
    if (validation.validations.hasOpenGraph) score += 10;
    if (validation.validations.hasTwitterCard) score += 10;
    if (indexNowSuccess) score += 10;

    const health = this.getSeoHealth(score);

    return {
      score,
      health,
      isPerfect: score === 100,
    };
  }

  getSeoHealth(score) {
    if (score === 100) return '🏆 PERFECT SEO';
    if (score >= 90) return '🟢 Excellent';
    if (score >= 80) return '🟡 Good';
    if (score >= 70) return '🟠 Fair';
    return '🔴 Poor';
  }
}