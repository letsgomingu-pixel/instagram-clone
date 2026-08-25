import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PostMoreIcon } from '@/components/post/PostActionIcons';
import type { Post } from '@/types';

interface PostOptionsMenuProps {
  post: Post;
  onUnfollow?: () => void;
}

export function PostOptionsMenu({ post, onUnfollow }: PostOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="더보기"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="p-1 hover:opacity-60"
      >
        <PostMoreIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-ig-border bg-white py-2 shadow-lg">
          <button
            type="button"
            onClick={copyLink}
            className="block w-full px-4 py-2.5 text-left text-[14px] hover:bg-ig-secondary"
          >
            링크 복사
          </button>
          <Link
            to={`/p/${post.id}`}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-[14px] hover:bg-ig-secondary"
          >
            게시물로 이동
          </Link>
          {!post.user.is_own_profile && onUnfollow && (
            <button
              type="button"
              onClick={() => {
                onUnfollow();
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-[14px] text-ig-red hover:bg-ig-secondary"
            >
              팔로우 취소
            </button>
          )}
        </div>
      )}
    </div>
  );
}
