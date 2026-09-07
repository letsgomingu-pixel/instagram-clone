import { useEffect, useState, useCallback, useRef } from 'react';

import { X, ChevronLeft, ChevronRight } from 'lucide-react';

import { Avatar } from '@/components/common/Avatar';
import { MediaImage } from '@/components/common/MediaImage';
import { StoryOverlayLayer } from '@/components/story/StoryOverlayLayer';
import { formatRelativeTime } from '@/utils/formatDate';
import { resolveMediaUrl } from '@/utils/media';

import { useApp } from '@/contexts/AppContext';

import { useRequireAuth } from '@/hooks/useRequireAuth';



interface StoryViewerProps {

  initialIndex: number;

  onClose: () => void;

}



const IMAGE_STORY_DURATION = 5000;



export function StoryViewer({ initialIndex, onClose }: StoryViewerProps) {

  const { stories, markStoryViewed } = useApp();

  const { requireAuth, isAuthenticated } = useRequireAuth();

  const [storyIndex, setStoryIndex] = useState(initialIndex);

  const [itemIndex, setItemIndex] = useState(0);

  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);



  const story = stories[storyIndex];

  const item = story?.items[itemIndex];

  const isVideo = item?.media_type === 'video';



  const goNext = useCallback(() => {

    if (!story) return;

    if (itemIndex < story.items.length - 1) {

      setItemIndex((i) => i + 1);

      setProgress(0);

    } else if (storyIndex < stories.length - 1) {

      setStoryIndex((i) => i + 1);

      setItemIndex(0);

      setProgress(0);

    } else {

      onClose();

    }

  }, [story, itemIndex, storyIndex, stories.length, onClose]);



  const goPrev = useCallback(() => {

    if (itemIndex > 0) {

      setItemIndex((i) => i - 1);

      setProgress(0);

    } else if (storyIndex > 0) {

      const prevStory = stories[storyIndex - 1];

      setStoryIndex((i) => i - 1);

      setItemIndex(prevStory.items.length - 1);

      setProgress(0);

    }

  }, [itemIndex, storyIndex, stories]);



  useEffect(() => {

    if (!story) return;

    markStoryViewed(story.id);

  }, [story, markStoryViewed]);



  useEffect(() => {

    setProgress(0);

  }, [storyIndex, itemIndex]);



  useEffect(() => {

    if (!item || isVideo) return;



    const interval = setInterval(() => {

      setProgress((p) => {

        if (p >= 100) {

          goNext();

          return 0;

        }

        return p + (100 / (IMAGE_STORY_DURATION / 50));

      });

    }, 50);

    return () => clearInterval(interval);

  }, [goNext, storyIndex, itemIndex, item, isVideo]);



  useEffect(() => {

    const video = videoRef.current;

    if (!item || !isVideo || !video) return;



    const handleLoaded = () => {

      video.currentTime = 0;

      void video.play().catch(() => undefined);

    };



    const handleTimeUpdate = () => {

      if (!video.duration) return;

      setProgress((video.currentTime / video.duration) * 100);

      if (video.currentTime >= video.duration - 0.05) {

        goNext();

      }

    };



    video.addEventListener('loadedmetadata', handleLoaded);

    video.addEventListener('timeupdate', handleTimeUpdate);

    if (video.readyState >= 1) handleLoaded();



    return () => {

      video.removeEventListener('loadedmetadata', handleLoaded);

      video.removeEventListener('timeupdate', handleTimeUpdate);

    };

  }, [goNext, item, isVideo, storyIndex, itemIndex]);



  useEffect(() => {

    const handleKey = (e: KeyboardEvent) => {

      if (e.key === 'Escape') onClose();

      if (e.key === 'ArrowRight') goNext();

      if (e.key === 'ArrowLeft') goPrev();

    };

    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKey);

    return () => {

      document.body.style.overflow = '';

      window.removeEventListener('keydown', handleKey);

    };

  }, [onClose, goNext, goPrev]);



  if (!story || !item) return null;



  const altText = `${story.user.username}의 스토리`;



  return (

    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in">

      <button

        onClick={onClose}

        className="absolute top-4 right-4 z-10 text-white hover:opacity-70"

        aria-label="닫기"

      >

        <X size={28} />

      </button>



      {storyIndex > 0 || itemIndex > 0 ? (

        <button

          onClick={goPrev}

          className="absolute left-2 z-10 text-white/80 hover:text-white p-2 hidden md:block"

          aria-label="이전"

        >

          <ChevronLeft size={32} />

        </button>

      ) : null}



      {storyIndex < stories.length - 1 || itemIndex < story.items.length - 1 ? (

        <button

          onClick={goNext}

          className="absolute right-2 z-10 text-white/80 hover:text-white p-2 hidden md:block"

          aria-label="다음"

        >

          <ChevronRight size={32} />

        </button>

      ) : null}



      <div className="relative w-full max-w-[400px] h-full max-h-[90vh] md:rounded-xl overflow-hidden">

        <div className="absolute top-2 left-2 right-2 z-10 flex gap-1" data-testid="story-progress">

          {story.items.map((_, i) => (

            <div

              key={i}

              data-testid="story-progress-bar"

              className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden"

            >

              <div

                className="h-full bg-white transition-all duration-75"

                style={{

                  width: i < itemIndex ? '100%' : i === itemIndex ? `${progress}%` : '0%',

                }}

              />

            </div>

          ))}

        </div>



        <div className="absolute top-5 left-3 right-3 z-10 flex items-center gap-3">

          <Avatar src={story.user.avatar_url} alt={story.user.username} size="sm" />

          <div className="flex-1">

            <span className="text-white text-sm font-semibold">{story.user.username}</span>

            <span className="text-white/70 text-xs ml-2">{formatRelativeTime(item.created_at)}</span>

          </div>

        </div>



        {isVideo ? (

          <video

            ref={videoRef}

            src={resolveMediaUrl(item.image_url)}

            className="w-full h-full object-cover"

            muted

            playsInline

            preload="metadata"

            aria-label={altText}

          />

        ) : (

          <MediaImage src={item.image_url} alt={altText} className="w-full h-full object-cover" />

        )}



        <StoryOverlayLayer overlays={item.overlays ?? []} />



        <div className="absolute inset-0 flex">

          <button className="flex-1" onClick={goPrev} aria-label="이전 스토리" />

          <button className="flex-1" onClick={goNext} aria-label="다음 스토리" />

        </div>



        <div className="absolute bottom-4 left-3 right-3 z-10">

          <input

            type="text"

            placeholder={isAuthenticated ? `${story.user.username}에게 답장...` : '로그인하여 답장...'}

            onFocus={() => !isAuthenticated && requireAuth()}

            onClick={() => !isAuthenticated && requireAuth()}

            readOnly={!isAuthenticated}

            className="w-full bg-transparent border border-white/50 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/70 cursor-pointer"

          />

        </div>

      </div>

    </div>

  );

}


