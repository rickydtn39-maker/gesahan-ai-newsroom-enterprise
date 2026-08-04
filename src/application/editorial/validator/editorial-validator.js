// FILE: src/application/editorial/validator/editorial-validator.js

export class EditorialValidator {
  validateIngest(result) {
    if (!result) throw new Error('Ingest Engine output is null.');
    if (!result.extractedInfo) throw new Error('Missing "extractedInfo" in Gemini Analyst output.');
    if (!result.seo) throw new Error('Missing "seo" in Gemini Analyst output.');
    if (!result.wordpress) throw new Error('Missing "wordpress" in Gemini Analyst output.');
    if (!result.newsValue) throw new Error('Missing "newsValue" in Gemini Analyst output.');
    if (!result.priority) throw new Error('Missing "priority" in Gemini Analyst output.');
    if (!result.confidence) throw new Error('Missing "confidence" in Gemini Analyst output.');
    if (!result.draftReporter) throw new Error('Missing "draftReporter" in Gemini Analyst output.');
    return result;
  }

  validateEditorial(result) {
    if (!result) throw new Error('Editorial Engine output is null.');
    if (!result.title) throw new Error('Missing "title" in Gemini Narrative output.');
    if (!result.subtitle) throw new Error('Missing "subtitle" in Gemini Narrative output.');
    if (!result.excerpt) throw new Error('Missing "excerpt" in Gemini Narrative output.');
    if (!result.lead) throw new Error('Missing "lead" in Gemini Narrative output.');
    if (!result.body) throw new Error('Missing "body" in Gemini Narrative output.');
    return result;
  }
}