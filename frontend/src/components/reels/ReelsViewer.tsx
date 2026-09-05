import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import {

  X,

  ChevronUp,

  ChevronDown,

  Music2,

} from 'lucide-react';

import {
  ACTION_ICON_SIZE,
  DoubleTapHeartIcon,
  PostCommentIcon,
  PostLikeIcon,
  PostMoreIcon,
  PostShareIcon,
  REEL_ACTION_ICON_SIZE,
} from '@/components/post/PostActionIcons';

import { Avatar } from '@/components/common/Avatar';
import { MediaImage } from '@/components/common/MediaImage';

import { useApp } from '@/contexts/AppContext';

import { useAuth } from '@/hooks/useAuth';

import { useRequireAuth } from '@/hooks/useRequireAuth';

import { formatCount } from '@/utils/formatDate';

import type { Reel } from '@/types';



interface ReelsViewerProps {

  reels: Reel[];

  initialIndex: number;

  onClose: () => void;

}



export function ReelsViewer({ reels, initialIndex, onClose }: ReelsViewerProps) {

  const { toggleReelLike, followUser, markReelViewed } = useApp();

  const { user: currentUser } = useAuth();

  const { requireAuth } = useRequireAuth();

  const [index, setIndex] = useState(initialIndex);

  const [showHeart, setShowHeart] = useState(false);



  const reel = reels[index];

  const isOwnReel = currentUser?.id === reel?.user.id;

  const showFollow = reel && !isOwnReel && !reel.user.is_following;



  const goNext = useCallback(() => {

    if (index < reels.length - 1) setIndex((i) => i + 1);

    else onClose();

  }, [index, reels.length, onClose]);



  const goPrev = useCallback(() => {

    if (index > 0) setIndex((i) => i - 1);

  }, [index]);



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



  useEffect(() => {

    if (reel) markReelViewed(reel.id);

  }, [reel, markReelViewed]);



  useEffect(() => {

    const handleKey = (e: KeyboardEvent) => {

      if (e.key === 'Escape') onClose();

      if (e.key === 'ArrowDown') goNext();

      if (e.key === 'ArrowUp') goPrev();

    };

    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKey);

    return () => {

      document.body.style.overflow = '';

      window.removeEventListener('keydown', handleKey);

    };

  }, [onClose, goNext, goPrev]);



  if (!reel) return null;



  return (

    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">

      <button

        onClick={onClose}

        className="absolute top-4 right-4 z-10 text-white hover:opacity-70 p-2"

        aria-label="닫기"

      >

        <X size={ACTION_ICON_SIZE} fill="none" stroke="white" />

      </button>



      {index > 0 && (

        <button

          onClick={goPrev}

          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20"

          aria-label="이전 현장영상"

        >

          <ChevronUp size={ACTION_ICON_SIZE} fill="none" stroke="white" />

        </button>

      )}



      {index < reels.length - 1 && (

        <button

          onClick={goNext}

          className="absolute left-4 bottom-1/4 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20"

          aria-label="다음 현장영상"

        >

          <ChevronDown size={ACTION_ICON_SIZE} fill="none" stroke="white" />

        </button>

      )}



      <div className="relative w-full max-w-[420px] h-full max-h-[100dvh] md:max-h-[90vh] md:rounded-lg overflow-hidden">

        <div

          className="absolute inset-0 cursor-pointer"

          onDoubleClick={handleDoubleClick}

        >

          <MediaImage
            src={reel.thumbnail_url}
            alt={reel.caption || '현장영상'}
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

        </div>



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



          {reel.caption && (

            <p className="text-[14px] mb-2 line-clamp-2">{reel.caption}</p>

          )}



          {reel.audio_name && (

            <div className="flex items-center gap-2 text-[13px]">

              <Music2 size={14} />

              <span className="truncate">{reel.audio_name}</span>

            </div>

          )}

        </div>

      </div>



      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-[12px] hidden md:block">

        {index + 1} / {reels.length}

      </div>

    </div>

  );

}


