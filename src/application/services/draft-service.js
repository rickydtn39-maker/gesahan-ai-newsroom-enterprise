import { Draft } from '../../domain/draft/draft.js';

export function attachSourceText(draft, text) {
  return new Draft({
    ...draft,

    source: {
      ...draft.source,
      type: 'text',
      text,
    },

    updatedAt: new Date().toISOString(),
  });
}
