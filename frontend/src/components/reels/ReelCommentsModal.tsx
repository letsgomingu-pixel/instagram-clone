import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Smile, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/common/Avatar';
import { Spinner } from '@/components/common/Spinner';
import { MultilineText } from '@/components/common/MultilineText';
import { formatRelativeTime } from '@/utils/formatDate';
import * as reelsApi from '@/api/reels';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/utils/cn';
import type { Reel, ReelComment } from '@/types';

interface ReelCommentsPanelProps {
  reel: Reel;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: (commentCount: number) => void;
  className?: string;
}

function ReelCommentRow({ comment }: { comment: ReelComment }) {
  return (
    <div className="flex gap-3 py-3">
      <Link to={`/profile/${comment.user.username}`} className="shrink-0">
        <Avatar src={comment.user.avatar_url} alt={comment.user.username} size="sm" />
      </Link>
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-[14px] leading-[18px]">
          <Link
            to={`/profile/${comment.user.username}`}
            className="font-semibold mr-1.5 hover:underline"
          >
            {comment.user.username}
          </Link>
          <MultilineText as="span">{comment.content}</MultilineText>
        </p>
        <div className="flex items-center gap-3 mt-2">
          <time className="text-[12px] text-ig-text-secondary">
            {formatRelativeTime(comment.created_at)}
          </time>
          <button type="button" className="text-[12px] text-ig-text-secondary font-semibold">
            답글 달기
          </button>
        </div>
      </div>
      <button type="button" className="shrink-0 self-center text-ig-text-secondary hover:text-ig-text p-1" aria-label="댓글 좋아요">
        <svg aria-hidden className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M12 21s-6.7-4.2-9.2-7.6C.8 10.8 1.4 6.8 4.6 4.9c2.3-1.4 5.2-.9 7.4 1.1L12 6.5l.1-.1c2.2-2 5.1-2.5 7.4-1.1 3.2 1.9 3.8 5.9 1.8 8.5C18.7 16.8 12 21 12 21z" />
        </svg>
      </button>
    </div>
  );
}

export function ReelCommentsPanel({
  reel,
  isOpen,
  onClose,
  onCommentAdded,
  className,
}: ReelCommentsPanelProps) {
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

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

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'flex flex-col bg-white h-full w-full overflow-hidden',
        className,
      )}
    >
      <header className="relative flex items-center justify-center h-[44px] border-b border-ig-border shrink-0 px-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-3 p-1 text-ig-text hover:opacity-70"
          aria-label="댓글 닫기"
        >
          <X size={20} />
        </button>
        <h2 className="text-[16px] font-semibold">댓글</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 min-h-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-ig-text-secondary text-center py-12">아직 댓글이 없습니다.</p>
        ) : (
          <div className="divide-y divide-ig-border/60">
            {comments.map((comment) => (
              <ReelCommentRow key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-ig-border px-4 py-3">
        {user ? (
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar_url} alt={user.username} size="sm" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="댓글 달기..."
              className="flex-1 text-[14px] border-none outline-none bg-transparent placeholder:text-ig-text-secondary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button type="button" className="text-ig-text-secondary p-1" aria-label="이모티콘">
              <Smile size={22} strokeWidth={1.5} />
            </button>
            {draft.trim() && (
              <button
                type="button"
                disabled={sending}
                onClick={handleSubmit}
                className="text-[14px] font-semibold text-ig-primary disabled:opacity-40 shrink-0"
              >
                게시
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-ig-text-secondary text-center py-1">
            <Link to="/login" className="text-ig-primary font-semibold">
              로그인
            </Link>
            하면 댓글을 남길 수 있습니다.
          </p>
        )}
      </footer>
    </div>
  );
}

/** @deprecated Use ReelCommentsPanel — kept for existing imports */
export const ReelCommentsModal = ReelCommentsPanel;
