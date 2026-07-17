export class EditorialResult {
  constructor(data) {
    this.article = data.article;

    this.seo = data.seo;

    this.statistics = data.statistics;

    this.quality = data.quality;

    Object.freeze(this);
  }
}
