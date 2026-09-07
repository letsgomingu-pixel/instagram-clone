import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2 } from 'lucide-react';
import {
  DoubleTapHeartIcon,
  PostCommentIcon,
  PostLikeIcon,
  PostMoreIcon,
  PostShareIcon,
  REEL_ACTION_ICON_SIZE,
} from '@/components/post/PostActionIcons';
import { Avatar } from '@/components/common/Avatar';
import { MediaImage } from '@/components/common/MediaImage';
import { CreateReelModal } from '@/components/reels/CreateReel';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { formatCount } from '@/utils/formatDate';
import { resolveMediaUrl } from '@/utils/media';
import type { Reel } from '@/types';

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
}

function ReelMedia({ reel, isActive }: { reel: Reel; isActive: boolean }) {
  if (reel.video_url) {
    return (
      <video
        src={resolveMediaUrl(reel.video_url)}
        poster={resolveMediaUrl(reel.thumbnail_url)}
        className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-100' : 'opacity-90'}`}
        muted
        playsInline
        loop
        autoPlay={isActive}
      />
    );
  }

  return (
    <MediaImage
      src={reel.thumbnail_url}
      alt={reel.caption || '릴스'}
      className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-100' : 'opacity-90'}`}
    />
  );
}

function ReelItem({ reel, isActive }: ReelItemProps) {
  const { toggleReelLike, followUser } = useApp();
  const { user: currentUser } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [showHeart, setShowHeart] = useState(false);

  const isOwnReel = currentUser?.id === reel.user.id;
  const showFollow = !isOwnReel && !reel.user.is_following;

  const handleDoubleClick = () => {
    requireAuth(() => {
      if (!reel.is_liked) toggleReelLike(reel.id);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    });
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requireAuth(() => {
      void followUser(reel.user.id);
    });
  };

  return (
    <section className="relative w-full h-[calc(100dvh-var(--mobile-header-stack,92px))] md:h-[calc(100dvh)] snap-start snap-always flex items-center justify-center bg-black">
      <div
        className="relative w-full max-w-[420px] h-full md:max-h-[90vh] md:rounded-lg overflow-hidden"
        onDoubleClick={handleDoubleClick}
      >
        <ReelMedia reel={reel} isActive={isActive} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <DoubleTapHeartIcon tone="reels" className="animate-heart-pop drop-shadow-lg" />
          </div>
        )}

        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
          <button
            onClick={() => requireAuth(() => toggleReelLike(reel.id))}
            className="flex flex-col items-center gap-1 text-white"
            aria-label="좋아요"
          >
            <PostLikeIcon liked={reel.is_liked} size={REEL_ACTION_ICON_SIZE} tone="reels" />
            <span className="text-[12px] font-semibold">{formatCount(reel.like_count)}</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white" aria-label="댓글">
            <PostCommentIcon size={REEL_ACTION_ICON_SIZE} tone="reels" />
            <span className="text-[12px] font-semibold">{formatCount(reel.comment_count)}</span>
          </button>
          <button className="text-white" aria-label="공유">
            <PostShareIcon size={REEL_ACTION_ICON_SIZE} tone="reels" />
          </button>
          <button className="text-white" aria-label="더보기">
            <PostMoreIcon size={REEL_ACTION_ICON_SIZE} tone="reels" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-14 p-4 z-10 text-white">
          <Link to={`/profile/${reel.user.username}`} className="flex items-center gap-3 mb-3">
            <Avatar src={reel.user.avatar_url} alt={reel.user.username} size="sm" />
            <span className="text-[14px] font-semibold hover:underline">{reel.user.username}</span>
            {showFollow && (
              <button
                type="button"
                onClick={handleFollow}
                className="ml-1 text-[14px] font-semibold border border-white rounded-lg px-3 py-1 hover:bg-white/10"
              >
                팔로우
              </button>
            )}
          </Link>

          {reel.caption && <p className="text-[14px] mb-2 line-clamp-2">{reel.caption}</p>}

          {reel.audio_name && (
            <div className="flex items-center gap-2 text-[13px]">
              <Music2 size={14} />
              <span className="truncate">{reel.audio_name}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ReelsPage() {
  const { reels, markReelViewed } = useApp();
  const { requireAuth } = useRequireAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const index = Math.round(scrollTop / itemHeight);
      setActiveIndex(index);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const reel = reels[activeIndex];
    if (reel) markReelViewed(reel.id);
  }, [activeIndex, reels, markReelViewed]);

  return (
    <>
      <button
        type="button"
        onClick={() => requireAuth(() => setCreateOpen(true))}
        className="fixed top-16 right-4 md:right-8 z-40 rounded-full bg-white/10 text-white px-4 py-2 text-sm font-semibold hover:bg-white/20"
        aria-label="릴스 만들기"
      >
        + 릴스
      </button>
      <CreateReelModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />

      {reels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-white">
          <p className="text-[16px] mb-4">아직 릴스가 없습니다.</p>
          <button
            type="button"
            onClick={() => requireAuth(() => setCreateOpen(true))}
            className="rounded-lg bg-ig-primary px-4 py-2 text-sm font-semibold text-white"
          >
            첫 릴스 만들기
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="fixed inset-x-0 bottom-0 md:left-[245px] top-[var(--mobile-header-stack,92px)] md:top-0 overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-black z-20"
          style={{ scrollbarWidth: 'none' }}
        >
          {reels.map((reel, index) => (
            <ReelItem key={reel.id} reel={reel} isActive={index === activeIndex} />
          ))}
        </div>
      )}
    </>
  );
}
