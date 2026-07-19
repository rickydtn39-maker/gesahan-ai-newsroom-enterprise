export function attachSourceText(draft, text) {
  return draft.copyWith({
    source: {
      ...draft.source,
      type: 'text',
      text,
    },
  });
}
