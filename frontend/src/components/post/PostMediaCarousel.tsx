import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { MediaImage } from '@/components/common/MediaImage';
import { resolveMediaUrl } from '@/utils/media';
import type { PostMedia } from '@/types';

interface PostMediaCarouselProps {
  media: PostMedia[];
  alt: string;
  onDoubleTap?: () => void;
  showHeart?: boolean;
  heartIcon?: React.ReactNode;
}

const SWIPE_THRESHOLD_PX = 50;

export function PostMediaCarousel({
  media,
  alt,
  onDoubleTap,
  showHeart,
  heartIcon,
}: PostMediaCarouselProps) {
  const items = media.length > 0 ? media : [];
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const lastTapRef = useRef(0);
  const current = items[index] ?? items[0];
  const hasMultiple = items.length > 1;

  const goToIndex = useCallback(
    (next: number) => {
      if (next < 0 || next >= items.length) return;
      setIndex(next);
    },
    [items.length],
  );

  const toggleMuted = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((m) => !m);
  }, []);

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      goToIndex(index - 1);
    },
    [goToIndex, index],
  );

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      goToIndex(index + 1);
    },
    [goToIndex, index],
  );

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onDoubleTap?.();
    }
    lastTapRef.current = now;
  }, [onDoubleTap]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const startX = touchStartX.current;
      touchStartX.current = null;
      if (startX == null || !hasMultiple) return;

      const endX = e.changedTouches[0]?.clientX ?? startX;
      const delta = endX - startX;
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;

      if (delta < 0 && index < items.length - 1) {
        goToIndex(index + 1);
      } else if (delta > 0 && index > 0) {
        goToIndex(index - 1);
      }
    },
    [goToIndex, hasMultiple, index, items.length],
  );

  if (!current) return null;

  return (
    <div
      className="group relative w-full aspect-square bg-black select-none touch-manipulation overflow-hidden"
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={0}
      aria-label="게시물 미디어 — 더블 탭하여 좋아요, 스와이프하여 넘기기"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleTap();
        if (e.key === 'ArrowLeft') goToIndex(index - 1);
        if (e.key === 'ArrowRight') goToIndex(index + 1);
      }}
    >
      {current.media_type === 'video' ? (
        <>
          <video
            src={resolveMediaUrl(current.media_url)}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            loop
            muted={muted}
          />
          <button
            type="button"
            onClick={toggleMuted}
            className="absolute bottom-4 right-4 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
            aria-label={muted ? '음소거 해제' : '음소거'}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </>
      ) : (
        <MediaImage
          src={current.media_url}
          alt={alt}
          className="w-full h-full object-cover pointer-events-none"
          loading="lazy"
          draggable={false}
        />
      )}

      {showHeart && heartIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {heartIcon}
        </div>
      )}

      {hasMultiple && index > 0 && (
        <button
          type="button"
          onClick={goPrev}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 shadow-md hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="이전"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {hasMultiple && index < items.length - 1 && (
        <button
          type="button"
          onClick={goNext}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 shadow-md hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="다음"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {hasMultiple && (
        <div className="absolute top-4 right-4 bg-black/75 text-white text-[12px] font-semibold px-2 py-1 rounded-[13px] leading-none">
          {index + 1}/{items.length}
        </div>
      )}

      {hasMultiple && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-[4px] pointer-events-none">
          {items.map((item, i) => (
            <span
              key={item.id}
              className={`h-[6px] w-[6px] rounded-full shadow-sm ${
                i === index ? 'bg-ig-primary' : 'bg-white/55'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
