import { useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

export function PostMediaCarousel({
  media,
  alt,
  onDoubleTap,
  showHeart,
  heartIcon,
}: PostMediaCarouselProps) {
  const items = media.length > 0 ? media : [];
  const [index, setIndex] = useState(0);
  const current = items[index] ?? items[0];
  const hasMultiple = items.length > 1;

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIndex((i) => (i - 1 + items.length) % items.length);
    },
    [items.length],
  );

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIndex((i) => (i + 1) % items.length);
    },
    [items.length],
  );

  if (!current) return null;

  return (
    <div
      className="relative aspect-square bg-black select-none touch-manipulation overflow-hidden"
      onClick={onDoubleTap}
      role="button"
      tabIndex={0}
      aria-label="게시물 미디어 — 더블 탭하여 좋아요"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onDoubleTap?.();
      }}
    >
      {current.media_type === 'video' ? (
        <video
          src={resolveMediaUrl(current.media_url)}
          className="w-full h-full object-cover pointer-events-none"
          controls
          playsInline
          loop
          muted
        />
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
