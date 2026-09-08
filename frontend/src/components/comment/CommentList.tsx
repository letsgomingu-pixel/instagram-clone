import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/common/Avatar';
import { MultilineText } from '@/components/common/MultilineText';
import { formatRelativeTime } from '@/utils/formatDate';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import * as postsApi from '@/api/posts';
import type { Comment } from '@/types';

interface CommentListProps {
  comments: Comment[];
  postId?: number;
  postOwnerId?: number;
  onCommentsChange?: (comments: Comment[]) => void;
}

function CommentRow({
  comment,
  postId,
  postOwnerId,
  depth,
  onReply,
  onLikeToggle,
  onDelete,
  onRefresh,
}: {
  comment: Comment;
  postId?: number;
  postOwnerId?: number;
  depth: number;
  onReply: (parentId: number) => void;
  onLikeToggle: (commentId: number, isLiked: boolean, likeCount: number) => void;
  onDelete: (commentId: number) => void;
  onRefresh: () => Promise<void>;
}) {
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const canDelete = !!user && (user.id === comment.user.id || user.id === postOwnerId);

  const handleLike = () => {
    if (!postId) return;
    requireAuth(async () => {
      const res = await postsApi.toggleCommentLike(postId, comment.id);
      onLikeToggle(comment.id, res.is_liked, res.like_count);
    });
  };

  const submitReply = async () => {
    if (!postId || !replyText.trim()) return;
    requireAuth(async () => {
      await postsApi.addComment(postId, replyText.trim(), comment.id);
      await onRefresh();
      setReplyText('');
      setReplying(false);
    });
  };

  const handleDelete = () => {
    if (!postId || !canDelete) return;
    if (!window.confirm('댓글을 삭제할까요?')) return;
    requireAuth(async () => {
      try {
        await postsApi.deleteComment(postId, comment.id);
        onDelete(comment.id);
      } catch {
        toast.error('댓글 삭제에 실패했습니다.');
      }
    });
  };

  return (
    <div className={depth > 0 ? 'ml-8 mt-2' : ''}>
      <div className="flex gap-3">
        <Link to={`/profile/${comment.user.username}`}>
          <Avatar src={comment.user.avatar_url} alt={comment.user.username} size="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <Link to={`/profile/${comment.user.username}`} className="font-semibold mr-1 hover:underline">
              {comment.user.username}
            </Link>
            <MultilineText as="span">{comment.content}</MultilineText>
          </p>
          <div className="flex items-center gap-3 mt-1">
            <time className="text-[10px] text-ig-text-secondary">
              {formatRelativeTime(comment.created_at)}
            </time>
            {(comment.like_count ?? 0) > 0 && (
              <span className="text-[10px] text-ig-text-secondary font-semibold">
                좋아요 {comment.like_count}개
              </span>
            )}
            {depth === 0 && (
              <button
                type="button"
                onClick={() => requireAuth(() => {
                  onReply(comment.id);
                  setReplying(true);
                })}
                className="text-[10px] text-ig-text-secondary font-semibold hover:text-ig-text"
              >
                답글 달기
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-[10px] text-ig-text-secondary font-semibold hover:text-ig-red"
              >
                삭제
              </button>
            )}
          </div>
          {replying && (
            <div className="flex gap-2 mt-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`@${comment.user.username}에게 답글...`}
                className="flex-1 text-sm border-none outline-none bg-transparent"
                onKeyDown={(e) => e.key === 'Enter' && void submitReply()}
              />
              <button type="button" onClick={() => void submitReply()} className="text-ig-primary text-sm font-semibold">
                게시
              </button>
            </div>
          )}
        </div>
        {postId && (
          <button type="button" onClick={handleLike} aria-label="댓글 좋아요" className="p-1 self-start">
            <Heart
              size={12}
              className={comment.is_liked ? 'fill-red-500 text-red-500' : 'text-ig-text-secondary'}
            />
          </button>
        )}
      </div>
      {comment.replies?.map((reply) => (
        <CommentRow
          key={reply.id}
          comment={reply}
          postId={postId}
          postOwnerId={postOwnerId}
          depth={depth + 1}
          onReply={onReply}
          onLikeToggle={onLikeToggle}
          onDelete={onDelete}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

export function CommentList({ comments, postId, postOwnerId, onCommentsChange }: CommentListProps) {
  const refreshComments = async () => {
    if (!postId || !onCommentsChange) return;
    const res = await postsApi.getPostComments(postId);
    onCommentsChange(res.items);
  };

  const handleLikeToggle = (commentId: number, isLiked: boolean, likeCount: number) => {
    if (!onCommentsChange) return;
    const update = (list: Comment[]): Comment[] =>
      list.map((c) => {
        if (c.id === commentId) return { ...c, is_liked: isLiked, like_count: likeCount };
        if (c.replies?.length) return { ...c, replies: update(c.replies) };
        return c;
      });
    onCommentsChange(update(comments));
  };

  const handleDelete = (commentId: number) => {
    if (!onCommentsChange) return;
    const remove = (list: Comment[]): Comment[] =>
      list
        .filter((c) => c.id !== commentId)
        .map((c) => (c.replies?.length ? { ...c, replies: remove(c.replies) } : c));
    onCommentsChange(remove(comments));
  };

  if (comments.length === 0) {
    return (
      <p className="text-sm text-ig-text-secondary text-center py-8">
        아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentRow
          key={comment.id}
          comment={comment}
          postId={postId}
          postOwnerId={postOwnerId}
          depth={0}
          onReply={() => {}}
          onLikeToggle={handleLikeToggle}
          onDelete={handleDelete}
          onRefresh={refreshComments}
        />
      ))}
    </div>
  );
}
