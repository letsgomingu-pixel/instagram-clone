import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PostMoreIcon } from '@/components/post/PostActionIcons';
import { PostEditModal } from '@/components/post/PostEditModal';
import { useAuth } from '@/hooks/useAuth';
import type { Post } from '@/types';

const REPORT_REASONS = [
  { value: 'spam', label: '스팸' },
  { value: 'inappropriate', label: '부적절한 콘텐츠' },
  { value: 'violence', label: '폭력 또는 위험한 콘텐츠' },
  { value: 'other', label: '기타' },
] as const;

interface PostOptionsMenuProps {
  post: Post;
  onUnfollow?: () => void;
  onDelete?: () => void;
  onEdit?: (data: { caption?: string | null; location?: string | null }) => Promise<void>;
  onArchive?: () => Promise<void>;
  onHide?: () => Promise<void>;
  onReport?: (reason: string, details?: string) => Promise<void>;
  tone?: 'default' | 'reels';
}

export function PostOptionsMenu({
  post,
  onUnfollow,
  onDelete,
  onEdit,
  onArchive,
  onHide,
  onReport,
  tone = 'default',
}: PostOptionsMenuProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0].value);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwnPost = user?.id === post.user.id;

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const closeMenu = () => setOpen(false);

  const copyLink = async () => {
    const url = `${window.location.origin}/p/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('링크가 클립보드에 복사되었습니다.');
    } catch {
      toast.error('링크 복사에 실패했습니다.');
    }
    closeMenu();
  };

  const handleDelete = () => {
    if (!window.confirm('이 게시물을 삭제할까요?')) return;
    onDelete?.();
    closeMenu();
  };

  const handleArchive = async () => {
    if (!window.confirm('이 게시물을 보관할까요? 프로필에서 숨겨집니다.')) return;
    closeMenu();
    try {
      await onArchive?.();
      toast.success('게시물이 보관되었습니다.');
    } catch {
      toast.error('보관에 실패했습니다.');
    }
  };

  const handleHide = async () => {
    if (!window.confirm('이 게시물을 숨길까요? 피드에서 더 이상 표시되지 않습니다.')) return;
    closeMenu();
    try {
      await onHide?.();
      toast.success('게시물이 숨겨졌습니다.');
    } catch {
      toast.error('숨기기에 실패했습니다.');
    }
  };

  const handleReportSubmit = async () => {
    closeMenu();
    setShowReport(false);
    try {
      await onReport?.(reportReason);
      toast.success('신고가 접수되었습니다.');
    } catch {
      toast.error('신고에 실패했습니다.');
    }
  };

  const menuItemClass =
    tone === 'reels'
      ? 'block w-full px-4 py-2.5 text-left text-[14px] text-white hover:bg-white/10'
      : 'block w-full px-4 py-2.5 text-left text-[14px] hover:bg-ig-secondary';

  const menuClass =
    tone === 'reels'
      ? 'absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-white/20 bg-black/90 py-2 shadow-lg'
      : 'absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-ig-border bg-white py-2 shadow-lg';

  return (
    <>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          aria-label="더보기"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="p-1 hover:opacity-60"
        >
          <PostMoreIcon tone={tone === 'reels' ? 'reels' : 'default'} />
        </button>

        {open && (
          <div className={menuClass}>
            {isOwnPost && onEdit && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  setShowEdit(true);
                }}
                className={menuItemClass}
              >
                수정
              </button>
            )}
            {isOwnPost && onArchive && (
              <button type="button" onClick={() => void handleArchive()} className={menuItemClass}>
                보관
              </button>
            )}
            <button type="button" onClick={copyLink} className={menuItemClass}>
              링크 복사
            </button>
            <Link
              to={`/p/${post.id}`}
              onClick={closeMenu}
              className={tone === 'reels' ? menuItemClass : 'block px-4 py-2.5 text-[14px] hover:bg-ig-secondary'}
            >
              게시물로 이동
            </Link>
            {!isOwnPost && onHide && (
              <button type="button" onClick={() => void handleHide()} className={menuItemClass}>
                숨기기
              </button>
            )}
            {!isOwnPost && onReport && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  setShowReport(true);
                }}
                className={`${menuItemClass} text-ig-red`}
              >
                신고
              </button>
            )}
            {isOwnPost && onDelete && (
              <button type="button" onClick={handleDelete} className={`${menuItemClass} text-ig-red`}>
                삭제
              </button>
            )}
            {!isOwnPost && onUnfollow && (
              <button
                type="button"
                onClick={() => {
                  onUnfollow();
                  closeMenu();
                }}
                className={`${menuItemClass} text-ig-red`}
              >
                팔로우 취소
              </button>
            )}
          </div>
        )}
      </div>

      {onEdit && (
        <PostEditModal
          post={post}
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          onSave={onEdit}
        />
      )}

      {showReport && onReport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/65" onClick={() => setShowReport(false)} />
          <div className="relative z-10 bg-white rounded-xl w-full max-w-sm mx-4 p-4 shadow-xl">
            <h2 className="text-[16px] font-bold mb-4 text-center">게시물 신고</h2>
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-[14px] cursor-pointer">
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reportReason === value}
                    onChange={() => setReportReason(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReport(false)}
                className="flex-1 h-9 text-[14px] font-semibold rounded-lg bg-ig-secondary"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleReportSubmit()}
                className="flex-1 h-9 text-[14px] font-semibold rounded-lg bg-ig-red text-white"
              >
                신고
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
