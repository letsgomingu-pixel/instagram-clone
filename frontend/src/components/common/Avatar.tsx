import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/utils/cn';
import { resolveMediaUrl } from '@/utils/media';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  hasStory?: boolean;
  viewed?: boolean;
  className?: string;
}

const sizeMap = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-[150px] w-[150px]',
};

export function Avatar({ src, alt, size = 'md', hasStory, viewed, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(src);
  const showImage = Boolean(resolved) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const img = showImage ? (
    <img
      src={resolved}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn('rounded-full object-cover bg-white', sizeMap[size], className)}
    />
  ) : (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        'rounded-full bg-ig-secondary flex items-center justify-center text-ig-text-secondary',
        sizeMap[size],
        className,
      )}
    >
      <User className="w-1/2 h-1/2" />
    </div>
  );

  if (!hasStory) return img;

  return (
    <div className={cn(hasStory && !viewed ? 'story-ring' : 'story-ring-viewed', 'shrink-0')}>
      <div className="rounded-full bg-white p-[2px]">{img}</div>
    </div>
  );
}
