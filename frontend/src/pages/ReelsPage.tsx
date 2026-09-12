import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Music2 } from 'lucide-react';
import toast from 'react-hot-toast';
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
import { ReelCommentsPanel } from '@/components/reels/ReelCommentsModal';
import { ReelOptionsMenu } from '@/components/reels/ReelOptionsMenu';
import * as reelsApi from '@/api/reels';
import { reelShareUrl, shareUrl } from '@/utils/share';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { formatCount } from '@/utils/formatDate';
import { cn } from '@/utils/cn';
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
        className={`w-full h-full object-contain transition-opacity ${isActive ? 'opacity-100' : 'opacity-90'}`}
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
  const { toggleReelLike, followUser, refreshReels } = useApp();
  const { user: currentUser } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [showHeart, setShowHeart] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const handleShare = () => {
    void shareUrl(reelShareUrl(reel.id), `${reel.user.username}의 릴스`);
  };

  const handleDeleteReel = async () => {
    if (!window.confirm('릴스를 삭제할까요?')) return;
    try {
      await reelsApi.deleteReel(reel.id);
      toast.success('릴스가 삭제되었습니다.');
      await refreshReels();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const actionButtons = (tone: 'reels' | 'default') => (
    <>
      <button
        onClick={() => requireAuth(() => toggleReelLike(reel.id))}
        className={cn(
          'flex flex-col items-center gap-1',
          tone === 'reels' ? 'text-white' : 'text-ig-text',
        )}
        aria-label="좋아요"
      >
        <PostLikeIcon liked={reel.is_liked} size={REEL_ACTION_ICON_SIZE} tone={tone} />
        <span className="text-[12px] font-semibold">{formatCount(reel.like_count)}</span>
      </button>
      <button
        onClick={() => requireAuth(() => setCommentsOpen(true))}
        className={cn(
          'flex flex-col items-center gap-1',
          tone === 'reels' ? 'text-white' : 'text-ig-text',
        )}
        aria-label="댓글"
      >
        <PostCommentIcon size={REEL_ACTION_ICON_SIZE} tone={tone} />
        <span className="text-[12px] font-semibold">{formatCount(reel.comment_count)}</span>
      </button>
      <button
        onClick={() => requireAuth(handleShare)}
        className={tone === 'reels' ? 'text-white' : 'text-ig-text'}
        aria-label="공유"
      >
        <PostShareIcon size={REEL_ACTION_ICON_SIZE} tone={tone} />
      </button>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={tone === 'reels' ? 'text-white' : 'text-ig-text'}
          aria-label="더보기"
        >
          <PostMoreIcon size={REEL_ACTION_ICON_SIZE} tone={tone} />
        </button>
        {menuOpen && (
          <ReelOptionsMenu
            reelId={reel.id}
            isOwnReel={isOwnReel}
            onDelete={() => void handleDeleteReel()}
            onReport={!isOwnReel ? (reason) => reelsApi.reportReel(reel.id, reason) : undefined}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </>
  );

  const captionBlock = (lightText: boolean) => (
    <>
      <Link
        to={`/profile/${reel.user.username}`}
        className={cn('flex items-center gap-3 mb-3', lightText ? 'text-white' : 'text-ig-text')}
      >
        <Avatar src={reel.user.avatar_url} alt={reel.user.username} size="sm" />
        <span className="text-[14px] font-semibold hover:underline">{reel.user.username}</span>
        {showFollow && (
          <button
            type="button"
            onClick={handleFollow}
            className={cn(
              'ml-1 text-[14px] font-semibold rounded-lg px-3 py-1',
              lightText
                ? 'border border-white hover:bg-white/10'
                : 'border border-ig-border hover:bg-ig-secondary',
            )}
          >
            팔로우
          </button>
        )}
      </Link>
      {reel.caption && (
        <p className={cn('text-[14px] mb-2 line-clamp-2', lightText ? 'text-white' : 'text-ig-text')}>
          {reel.caption}
        </p>
      )}
      {reel.audio_name && (
        <div
          className={cn(
            'flex items-center gap-2 text-[13px]',
            lightText ? 'text-white' : 'text-ig-text-secondary',
          )}
        >
          <Music2 size={14} />
          <span className="truncate">{reel.audio_name}</span>
        </div>
      )}
    </>
  );

  return (
    <section className="relative w-full h-[calc(100dvh-var(--mobile-header-stack,92px))] md:h-[calc(100dvh)] snap-start snap-always flex items-center justify-center bg-black md:bg-white">
      {/* Mobile: full-screen overlay actions */}
      <div
        className="md:hidden relative w-full max-w-[420px] h-full overflow-hidden"
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
          {actionButtons('reels')}
        </div>
        <div className="absolute bottom-0 left-0 right-14 p-4 z-10">{captionBlock(true)}</div>
      </div>

      {/* Desktop: video + actions + comments panel (Instagram-style) */}
      <div className="hidden md:flex items-center justify-center gap-4 h-full max-h-[90vh] px-4">
        <div
          className="relative w-[360px] h-[640px] max-h-[85vh] rounded-lg overflow-hidden bg-black shrink-0"
          onDoubleClick={handleDoubleClick}
        >
          <ReelMedia reel={reel} isActive={isActive} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
          {showHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <DoubleTapHeartIcon tone="reels" className="animate-heart-pop drop-shadow-lg" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">{captionBlock(true)}</div>
        </div>
        <div className="flex flex-col items-center gap-6 self-end pb-24 shrink-0">{actionButtons('default')}</div>
        {commentsOpen && (
          <div className="h-[640px] max-h-[85vh] w-[400px] rounded-xl border border-ig-border shadow-sm shrink-0 overflow-hidden">
            <ReelCommentsPanel reel={reel} isOpen onClose={() => setCommentsOpen(false)} />
          </div>
        )}
      </div>

      {/* Mobile: full-screen comments sheet */}
      {commentsOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white">
          <ReelCommentsPanel reel={reel} isOpen onClose={() => setCommentsOpen(false)} />
        </div>
      )}
    </section>
  );
}

export function ReelsPage() {
  const { reelId } = useParams<{ reelId?: string }>();
  const { reels, markReelViewed } = useApp();
  const { requireAuth } = useRequireAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!reelId || reels.length === 0) return;
    const idx = reels.findIndex((r) => r.id === Number(reelId));
    if (idx >= 0 && containerRef.current) {
      setActiveIndex(idx);
      containerRef.current.scrollTop = idx * containerRef.current.clientHeight;
    }
  }, [reelId, reels]);

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
        className="fixed top-16 right-4 md:right-8 z-40 rounded-lg border border-ig-border bg-ig-surface text-ig-text px-4 py-2 text-sm font-semibold hover:bg-ig-secondary md:top-6"
        aria-label="릴스 만들기"
      >
        + 릴스
      </button>
      <CreateReelModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />

      {reels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-ig-text md:bg-white min-h-[50vh]">
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
          className="fixed inset-x-0 bottom-0 md:left-[var(--sidebar-width)] top-[var(--mobile-header-stack,92px)] md:top-0 overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-black md:bg-white z-20"
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
