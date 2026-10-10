// @display-only: needs @tanstack/react-query v5 and the feed's infinite query (queryKey ['feed'])
// Optimistic like with rollback
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { likeInFeed } from './optimistic-like.js';

export function useLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postId => fetch(`/api/posts/${postId}/like`, { method: 'POST' }).then(r => { if (!r.ok) throw new Error('like failed'); }),
    onMutate: async postId => {
      await qc.cancelQueries({ queryKey: ['feed'] });               // an in-flight refetch must not overwrite the optimistic state
      const previous = qc.getQueryData(['feed']);
      qc.setQueryData(['feed'], data => likeInFeed(data, postId));
      return { previous };
    },
    onError: (_err, _postId, ctx) => qc.setQueryData(['feed'], ctx?.previous),   // roll back
    // No blanket invalidate: refetching an infinite feed reloads every page. Reconcile the one post if needed.
  });
}
