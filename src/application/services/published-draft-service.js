import { WORKFLOW_STATE } from '../../core/constants/index.js';

export function attachPublishedResult(draft, published) {
  return draft.copyWith({
    state: WORKFLOW_STATE.COMPLETED,
    published: {
      id: published.id,
      url: published.url,
      publishedAt: new Date().toISOString(),
    },
  });
}
