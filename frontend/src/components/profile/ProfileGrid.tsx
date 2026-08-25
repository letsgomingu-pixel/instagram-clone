import { MediaImage } from '@/components/common/MediaImage';
import { GridCommentIcon, GridLikeIcon } from '@/components/post/PostActionIcons';
import { useApp } from '@/contexts/AppContext';
import type { Post } from '@/types';

interface ProfileGridProps {
  posts: Post[];
  savedOnly?: boolean;
}

export function ProfileGrid({ posts, savedOnly = false }: ProfileGridProps) {
  const { setSelectedPost } = useApp();

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center border border-ig-border bg-white md:rounded-lg">
        <div className="w-[62px] h-[62px] border-2 border-ig-text rounded-full flex items-center justify-center mb-4">
          {savedOnly ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          )}
        </div>
        <h2 className="text-[28px] font-light mb-2">
          {savedOnly ? '저장' : '사진 공유'}
        </h2>
        <p className="text-[14px] text-ig-text-secondary max-w-[350px]">
          {savedOnly
            ? '저장한 사진과 동영상을 보려면 게시물 위의 아이콘을 탭하세요.'
            : '회원님의 사진과 동영상이 프로필에 표시됩니다.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-[3px] md:gap-1">
      {posts.map((post) => (
        <button
          key={post.id}
          onClick={() => setSelectedPost(post)}
          className="relative aspect-square group overflow-hidden bg-ig-secondary"
          aria-label={`${post.user.username}의 게시물`}
        >
          <MediaImage
            src={post.image_url}
            alt={post.caption || '게시물'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-semibold text-[16px]">
            <span className="flex items-center gap-2">
              <GridLikeIcon />
              {post.like_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-2">
              <GridCommentIcon />
              {post.comment_count.toLocaleString()}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
