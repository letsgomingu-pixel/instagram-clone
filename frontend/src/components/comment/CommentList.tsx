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
import { useApp } from '@/contexts/AppContext';
import type { Comment } from '@/types';

interface CommentListProps {
  comments: Comment[];
  postId?: number;
  postOwnerId?: number;
  onCommentsChange?: (comments: Comment[], total?: number) => void;
}

function CommentRow({
  comment,
  postId,
  postOwnerId,
  depth,
  onReply,
  onLikeToggle,
  onRefresh,
  onEdit,
  onDeleteComment,
}: {
  comment: Comment;
  postId?: number;
  postOwnerId?: number;
  depth: number;
  onReply: (parentId: number) => void;
  onLikeToggle: (commentId: number, isLiked: boolean, likeCount: number) => void;
  onRefresh: () => Promise<void>;
  onEdit: (commentId: number, content: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
}) {
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [saving, setSaving] = useState(false);
  const canEdit = !!user && user.id === comment.user.id;
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

  const handleSaveEdit = async () => {
    const next = editText.trim();
    if (!next || next === comment.content) {
      setEditing(false);
      setEditText(comment.content);
      return;
    }
    setSaving(true);
    try {
      await onEdit(comment.id, next);
      setEditing(false);
    } catch {
      toast.error('댓글 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!postId || !canDelete) return;
    if (!window.confirm('댓글을 삭제할까요?')) return;
    requireAuth(async () => {
      try {
        await onDeleteComment(comment.id);
        await onRefresh();
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
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full text-sm border border-ig-border rounded-lg px-3 py-2 bg-ig-secondary resize-none min-h-[60px]"
                maxLength={2200}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveEdit()}
                  disabled={saving || !editText.trim()}
                  className="text-xs font-semibold text-ig-primary disabled:opacity-40"
                >
                  {saving ? '저장 중…' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditText(comment.content);
                  }}
                  className="text-xs font-semibold text-ig-text-secondary"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm">
              <Link to={`/profile/${comment.user.username}`} className="font-semibold mr-1 hover:underline">
                {comment.user.username}
              </Link>
              <MultilineText as="span">{comment.content}</MultilineText>
            </p>
          )}
          {!editing && (
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
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[10px] text-ig-text-secondary font-semibold hover:text-ig-text"
              >
                수정
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
          )}
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
          onEdit={onEdit}
          onDeleteComment={onDeleteComment}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

export function CommentList({ comments, postId, postOwnerId, onCommentsChange }: CommentListProps) {
  const { editComment, removeComment } = useApp();

  const refreshComments = async () => {
    if (!postId || !onCommentsChange) return;
    const res = await postsApi.getPostComments(postId);
    onCommentsChange(res.items, res.total);
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

  const handleEdit = async (commentId: number, content: string) => {
    if (!postId) return;
    await editComment(postId, commentId, content);
    await refreshComments();
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!postId) return;
    await removeComment(postId, commentId);
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
          onEdit={handleEdit}
          onDeleteComment={handleDeleteComment}
          onRefresh={refreshComments}
        />
      ))}
    </div>
  );
}
