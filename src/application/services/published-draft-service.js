import { Draft } from '../../domain/draft/draft.js';
import { WORKFLOW_STATE } from '../../core/constants/index.js';

export function attachPublishedResult(draft, published) {
  return new Draft({
    ...draft,

    state: WORKFLOW_STATE.COMPLETED,

    published: {
      id: published.id,
      url: published.url,
      publishedAt: new Date().toISOString(),
    },

    updatedAt: new Date().toISOString(),
  });
}
