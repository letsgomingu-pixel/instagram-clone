import { Play } from 'lucide-react';
import { MediaImage } from '@/components/common/MediaImage';
import { isVideoMediaUrl, resolveMediaUrl } from '@/utils/media';
import type { PostMedia } from '@/types';

interface PostCoverMediaProps {
  imageUrl?: string | null;
  media?: PostMedia[];
  alt: string;
  className?: string;
  autoPlayVideo?: boolean;
  showVideoBadge?: boolean;
}

export function PostCoverMedia({
  imageUrl,
  media,
  alt,
  className = 'w-full h-full object-cover',
  autoPlayVideo = false,
  showVideoBadge = true,
}: PostCoverMediaProps) {
  const first = media?.[0];
  const url = first?.media_url ?? imageUrl ?? '';
  const isVideo =
    first?.media_type === 'video' || (first == null && isVideoMediaUrl(imageUrl));

  if (isVideo && url) {
    return (
      <div className="relative w-full h-full bg-black">
        <video
          src={resolveMediaUrl(url)}
          className={className}
          muted
          playsInline
          loop
          autoPlay={autoPlayVideo}
          preload="metadata"
          aria-label={alt}
        />
        {showVideoBadge && !autoPlayVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full bg-black/50 p-2 text-white">
              <Play size={20} fill="white" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return <MediaImage src={url} alt={alt} className={className} loading="lazy" />;
}
