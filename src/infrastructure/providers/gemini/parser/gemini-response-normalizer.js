export class GeminiResponseNormalizer {
  normalize(text) {
    return text
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();
  }
}
