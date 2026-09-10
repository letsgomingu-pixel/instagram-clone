import { Link } from 'react-router-dom';
import { StoryBar } from '@/components/story/StoryBar';
import { SuggestedUsersStrip } from '@/components/layout/SuggestedUsersStrip';
import { Button } from '@/components/common/Button';
import { FeedPostSkeleton } from '@/components/post/FeedPostSkeleton';
import { FeedTabs } from '@/components/post/FeedTabs';
import { PostCard } from '@/components/post/PostCard';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

export function HomePage() {
  const { posts, loading, feedTab, setFeedTab, feedHasMore, feedLoadingMore, loadMoreFeed } = useApp();
  const { user, isAuthenticated } = useAuth();

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

  const emptyMessage =
    feedTab === 'products'
      ? {
          title: '등록된 상품이 없습니다',
          desc: user?.is_admin
            ? '관리자 계정으로 수산물 상품을 등록하면 홈 피드에 표시됩니다.'
            : '판매자가 올린 수산물 상품이 여기에 표시됩니다.',
        }
      : {
          title: '리뷰가 없습니다',
          desc: isAuthenticated
            ? '배송 완료된 주문에서 사진 리뷰를 작성할 수 있습니다.'
            : '로그인 후 구매·배송 완료 시 리뷰를 작성할 수 있습니다.',
        };

  return (
    <div>
      <StoryBar />
      <SuggestedUsersStrip />
      <FeedTabs activeTab={feedTab} onChange={setFeedTab} />

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
          <p className="text-[22px] font-light mb-2 font-brand">{emptyMessage.title}</p>
          <p className="text-sm text-ig-text-secondary leading-[18px]">{emptyMessage.desc}</p>
          <div className="mt-6 flex justify-center">
            {feedTab === 'products' && user?.is_admin ? (
              <Link to="/admin/products">
                <Button>상품 등록하기</Button>
              </Link>
            ) : feedTab === 'reviews' ? (
              isAuthenticated ? (
                <Link to="/orders">
                  <Button>리뷰 작성하기</Button>
                </Link>
              ) : (
                <Link to="/login" state={{ from: '/' }}>
                  <Button>로그인</Button>
                </Link>
              )
            ) : null}
          </div>
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
