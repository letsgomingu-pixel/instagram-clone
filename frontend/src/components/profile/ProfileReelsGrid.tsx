import { Play } from 'lucide-react';
import { MediaImage } from '@/components/common/MediaImage';
import { ReelsIcon } from '@/components/common/ReelsIcon';
import { formatCount } from '@/utils/formatDate';
import type { Reel } from '@/types';

interface ProfileReelsGridProps {
  reels: Reel[];
  onReelClick: (index: number) => void;
}

export function ProfileReelsGrid({ reels, onReelClick }: ProfileReelsGridProps) {
  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center border border-ig-border bg-white md:rounded-lg">
        <div className="w-[62px] h-[62px] border-2 border-ig-text rounded-full flex items-center justify-center mb-4">
          <ReelsIcon size={24} />
        </div>
        <h2 className="text-[28px] font-light mb-2">릴스 공유</h2>
        <p className="text-[14px] text-ig-text-secondary max-w-[350px]">
          회원님의 릴스가 프로필에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-[3px] md:gap-1">
      {reels.map((reel, index) => (
        <button
          key={reel.id}
          onClick={() => onReelClick(index)}
          className="relative aspect-[9/16] group overflow-hidden bg-ig-secondary"
          aria-label={`${reel.user.username}의 릴스`}
        >
          <MediaImage
            src={reel.thumbnail_url}
            alt={reel.caption || '릴스'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[14px] font-semibold drop-shadow-md">
            <Play size={16} fill="white" />
            {formatCount(reel.view_count)}
          </div>
        </button>
      ))}
    </div>
  );
}
