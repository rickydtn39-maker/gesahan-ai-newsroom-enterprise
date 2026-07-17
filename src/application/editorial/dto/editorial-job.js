import { GESAHAN_STYLE_GUIDE } from '../style/gesahan-style-guide.js';

export function createEditorialJob(draft) {
  return Object.freeze({
    version: '1.0',

    engine: GESAHAN_STYLE_GUIDE,

    task: 'EDITORIAL_REWRITE',

    language: 'id',

    source: draft.source,

    options: {
      protectFacts: true,
      protectNames: true,
      protectQuotes: true,
      protectNumbers: true,
      protectLocations: true,
      generateSeo: true,
      generateSlug: true,
      generateTags: true,
      generateExcerpt: true,
    },
  });
}
