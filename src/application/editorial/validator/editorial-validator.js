export class EditorialValidator {
  validateIngest(result) {
    if (!result) throw new Error('Ingest Engine output is null.');
    if (!result.extractedInfo) throw new Error('Missing "extractedInfo" in Gemini output.');
    if (!result.seo) throw new Error('Missing "seo" in Gemini output.');
    if (!result.wordpress) throw new Error('Missing "wordpress" in Gemini output.');
    if (!result.newsValue) throw new Error('Missing "newsValue" in Gemini output.');
    if (!result.priority) throw new Error('Missing "priority" in Gemini output.');
    if (!result.confidence) throw new Error('Missing "confidence" in Gemini output.');
    if (!result.draftReporter) throw new Error('Missing "draftReporter" in Gemini output.');
    return result;
  }

  validateEditorial(result) {
    if (!result) throw new Error('Editorial Engine output is null.');
    if (!result.title) throw new Error('Missing "title" in GPT-4o output.');
    if (!result.lead) throw new Error('Missing "lead" in GPT-4o output.');
    if (!result.content) throw new Error('Missing "content" in GPT-4o output.');
    if (!result.qcReport) throw new Error('Missing "qcReport" in GPT-4o output.');
    return result;
  }
}
