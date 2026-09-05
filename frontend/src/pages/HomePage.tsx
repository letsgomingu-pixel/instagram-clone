import { StoryBar } from '@/components/story/StoryBar';
import { SuggestedUsersStrip } from '@/components/layout/SuggestedUsersStrip';
import { FeedPostSkeleton } from '@/components/post/FeedPostSkeleton';
import { PostCard } from '@/components/post/PostCard';
import { useApp } from '@/contexts/AppContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

export function HomePage() {
  const { posts, loading, feedHasMore, feedLoadingMore, loadMoreFeed } = useApp();

  const sentinelRef = useInfiniteScroll(() => {
    void loadMoreFeed();
  }, feedHasMore && !feedLoadingMore);

  if (loading) {
    return (
      <div>
        <div className="feed-card animate-pulse">
          <div className="flex gap-4 px-4 py-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                <div className="h-14 w-14 rounded-full bg-ig-secondary" />
                <div className="h-2 w-12 rounded bg-ig-secondary" />
              </div>
            ))}
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <FeedPostSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <StoryBar />
      <SuggestedUsersStrip />

      {posts.length === 0 ? (
        <div className="feed-card py-20 px-6 text-center">
          <div className="mx-auto mb-4 flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-ig-text">
            <svg
              aria-hidden
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <rect height="18" rx="2" width="18" x="3" y="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
          <p className="text-[22px] font-light mb-2 font-brand">현장피드에 등록된 상품이 없습니다</p>
          <p className="text-sm text-ig-text-secondary leading-[18px]">
            거래처를 팔로우하거나 카탈로그에서 새로운 수산물을 찾아보세요.
          </p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}

      {feedHasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8 min-h-[72px]">
          {feedLoadingMore && (
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-ig-border border-t-ig-text-secondary" />
          )}
        </div>
      )}
    </div>
  );
}
