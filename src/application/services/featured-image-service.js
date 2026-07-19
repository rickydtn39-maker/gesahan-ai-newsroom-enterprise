import { WORKFLOW_STATE } from '../../core/constants/index.js';

export function attachFeaturedImage(draft, photo) {
  return draft.copyWith({
    state: WORKFLOW_STATE.PUBLISHING,
    source: {
      ...draft.source,
      featuredImage: {
        fileId: photo.file_id,
        fileUniqueId: photo.file_unique_id,
        width: photo.width,
        height: photo.height,
      },
    },
  });
}
