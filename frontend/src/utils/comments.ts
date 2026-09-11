import type { Comment } from '@/types';

export function updateCommentInTree(
  comments: Comment[],
  commentId: number,
  patch: Partial<Comment>,
): Comment[] {
  return comments.map((c) => {
    if (c.id === commentId) return { ...c, ...patch };
    if (c.replies?.length) {
      return { ...c, replies: updateCommentInTree(c.replies, commentId, patch) };
    }
    return c;
  });
}
