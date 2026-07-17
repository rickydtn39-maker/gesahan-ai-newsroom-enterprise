export class EditorialValidator {
  validate(result) {
    if (!result.article) {
      throw new Error('Missing article.');
    }

    if (!result.seo) {
      throw new Error('Missing seo.');
    }

    if (!result.statistics) {
      throw new Error('Missing statistics.');
    }

    if (!result.quality) {
      throw new Error('Missing quality.');
    }

    return result;
  }
}