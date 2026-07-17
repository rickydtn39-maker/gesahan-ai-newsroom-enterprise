export class EditorialValidator {
  validate(result) {
    const required = [
      'title',
      'lead',
      'content',
      'slug',
      'excerpt',
      'focusKeyword',
      'metaDescription',
      'category',
      'tags',
      'readingTime',
      'wordCount',
      'qualityScore'
    ];

    const missing = required.filter((field) => {
      return result[field] === undefined || result[field] === null;
    });

    if (missing.length > 0) {
      throw new Error(
        `Editorial response is invalid. Missing fields: ${missing.join(', ')}`
      );
    }

    return result;
  }
}