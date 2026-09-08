import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { Spinner } from '@/components/common/Spinner';
import { MultilineText } from '@/components/common/MultilineText';
import { formatRelativeTime } from '@/utils/formatDate';
import * as reelsApi from '@/api/reels';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Reel, ReelComment } from '@/types';

interface ReelCommentsModalProps {
  reel: Reel;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: (commentCount: number) => void;
}

export function ReelCommentsModal({ reel, isOpen, onClose, onCommentAdded }: ReelCommentsModalProps) {
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    reelsApi
      .getReelComments(reel.id)
      .then((res) => setComments(res.items))
      .catch(() => toast.error('댓글을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [isOpen, reel.id]);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    requireAuth(async () => {
      setSending(true);
      try {
        const comment = await reelsApi.addReelComment(reel.id, trimmed);
        setComments((prev) => [...prev, comment]);
        setDraft('');
        onCommentAdded?.(reel.comment_count + 1);
      } catch {
        toast.error('댓글 작성에 실패했습니다.');
      } finally {
        setSending(false);
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <h2 className="text-base font-semibold mb-4">댓글</h2>
      <div className="max-h-[50vh] overflow-y-auto px-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-ig-text-secondary text-center py-8">아직 댓글이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Link to={`/profile/${comment.user.username}`}>
                  <Avatar src={comment.user.avatar_url} alt={comment.user.username} size="sm" />
                </Link>
                <div className="min-w-0">
                  <p className="text-sm">
                    <Link to={`/profile/${comment.user.username}`} className="font-semibold mr-1 hover:underline">
                      {comment.user.username}
                    </Link>
                    <MultilineText as="span">{comment.content}</MultilineText>
                  </p>
                  <time className="text-[10px] text-ig-text-secondary">
                    {formatRelativeTime(comment.created_at)}
                  </time>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {user && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-ig-border">
          <Avatar src={user.avatar_url} alt={user.username} size="sm" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="댓글 달기..."
            className="flex-1 text-sm border-none outline-none bg-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            type="button"
            disabled={!draft.trim() || sending}
            onClick={handleSubmit}
            className="text-sm font-semibold text-ig-primary disabled:opacity-40"
          >
            게시
          </button>
        </div>
      )}
    </Modal>
  );
}
