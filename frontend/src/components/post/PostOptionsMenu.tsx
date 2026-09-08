import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PostMoreIcon } from '@/components/post/PostActionIcons';
import { useAuth } from '@/hooks/useAuth';
import type { Post } from '@/types';

interface PostOptionsMenuProps {
  post: Post;
  onUnfollow?: () => void;
  onDelete?: () => void;
  tone?: 'default' | 'reels';
}

export function PostOptionsMenu({ post, onUnfollow, onDelete, tone = 'default' }: PostOptionsMenuProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
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

  const copyLink = async () => {
    const url = `${window.location.origin}/p/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('링크가 클립보드에 복사되었습니다.');
    } catch {
      toast.error('링크 복사에 실패했습니다.');
    }
    setOpen(false);
  };

  const handleDelete = () => {
    if (!window.confirm('이 게시물을 삭제할까요?')) return;
    onDelete?.();
    setOpen(false);
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
          <button type="button" onClick={copyLink} className={menuItemClass}>
            링크 복사
          </button>
          <Link
            to={`/p/${post.id}`}
            onClick={() => setOpen(false)}
            className={tone === 'reels' ? menuItemClass : 'block px-4 py-2.5 text-[14px] hover:bg-ig-secondary'}
          >
            게시물로 이동
          </Link>
          {isOwnPost && onDelete && (
            <button type="button" onClick={handleDelete} className={`${menuItemClass} text-ig-red`}>
              삭제
            </button>
          )}
          {!isOwnPost && onUnfollow && (
            <button type="button" onClick={() => { onUnfollow(); setOpen(false); }} className={`${menuItemClass} text-ig-red`}>
              팔로우 취소
            </button>
          )}
        </div>
      )}
    </div>
  );
}
