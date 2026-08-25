import { ProfileGrid } from './ProfileGrid';
import type { Post } from '@/types';

interface ProfileTaggedGridProps {
  posts: Post[];
}

export function ProfileTaggedGrid({ posts }: ProfileTaggedGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center border border-ig-border bg-white md:rounded-lg">
        <div className="w-[62px] h-[62px] border-2 border-ig-text rounded-full flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="text-[28px] font-light mb-2">회원님이 나온 사진</h2>
        <p className="text-[14px] text-ig-text-secondary max-w-[350px]">
          다른 사람이 회원님을 태그하면 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  return <ProfileGrid posts={posts} />;
}
