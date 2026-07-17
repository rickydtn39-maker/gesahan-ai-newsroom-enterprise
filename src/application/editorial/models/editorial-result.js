export class EditorialResult {
  constructor(data) {
    this.title = data.title;
    this.lead = data.lead;
    this.content = data.content;

    this.slug = data.slug;
    this.excerpt = data.excerpt;

    this.focusKeyword = data.focusKeyword;
    this.metaDescription = data.metaDescription;

    this.category = data.category;
    this.tags = data.tags ?? [];

    this.readingTime = data.readingTime;
    this.wordCount = data.wordCount;

    this.qualityScore = data.qualityScore;

    Object.freeze(this);
  }
}