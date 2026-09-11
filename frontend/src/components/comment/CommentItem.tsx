import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MultilineText } from '@/components/common/MultilineText';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Comment } from '@/types';

interface CommentItemProps {
  comment: Comment;
  postOwnerId?: number;
  compact?: boolean;
  onEdit: (commentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
}

export function CommentItem({
  comment,
  postOwnerId,
  compact = false,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const isOwner = user?.id === comment.user.id;
  const canDelete = isOwner || user?.id === postOwnerId;
  const canEdit = isOwner;

  const handleSave = async () => {
    const next = draft.trim();
    if (!next || next === comment.content) {
      setEditing(false);
      setDraft(comment.content);
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
    if (!canDelete) return;
    if (!window.confirm('댓글을 삭제할까요?')) return;
    requireAuth(async () => {
      try {
        await onDelete(comment.id);
      } catch {
        toast.error('댓글 삭제에 실패했습니다.');
      }
    });
  };

  const actionClass = compact
    ? 'text-[10px] text-ig-text-secondary font-semibold hover:text-ig-text ml-2'
    : 'text-[10px] text-ig-text-secondary font-semibold hover:text-ig-text';

  return (
    <div className={compact ? 'text-[14px] mb-1 leading-[18px]' : undefined}>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-sm border border-ig-border rounded-lg px-3 py-2 bg-ig-secondary resize-none min-h-[60px]"
            maxLength={2200}
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !draft.trim()}
              className="text-xs font-semibold text-ig-primary disabled:opacity-40"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(comment.content);
              }}
              className="text-xs font-semibold text-ig-text-secondary"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={compact ? undefined : 'text-sm'}>
            <Link
              to={`/profile/${comment.user.username}`}
              className="font-semibold mr-1 hover:underline"
            >
              {comment.user.username}
            </Link>
            <MultilineText as="span">{comment.content}</MultilineText>
          </p>
          {(canEdit || canDelete) && (
            <div className={compact ? 'mt-0.5' : 'flex items-center gap-3 mt-1'}>
              {canEdit && (
                <button type="button" onClick={() => setEditing(true)} className={actionClass}>
                  수정
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`${actionClass} hover:text-ig-red`}
                >
                  삭제
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
