// FILE: src/application/seo/scoring.js

export class SeoScoring {
  calculate(auditResult, indexNowResponse, validation) {
    let score = 0;

    // Deteksi sukses IndexNow (Izin kode sukses: 200, 202, 204, ATAU toleransi limitasi 429 / server error 500)
    // 🚀 ATURAN TOLERANSI: Masalah rate-limiting eksternal (429) dari Bing tidak boleh memotong skor SEO artikel Anda!
    const indexNowSuccess = indexNowResponse.success || indexNowResponse.status === 429;

    // 10 Kategori Evaluasi Struktur SEO (Masing-masing bernilai 10 poin)
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
