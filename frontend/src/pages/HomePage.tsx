import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { StoryBar } from '@/components/story/StoryBar';
import { SuggestedUsersStrip } from '@/components/layout/SuggestedUsersStrip';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { FeedPostSkeleton } from '@/components/post/FeedPostSkeleton';
import { FeedTabs } from '@/components/post/FeedTabs';
import { PostCard } from '@/components/post/PostCard';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import * as ordersApi from '@/api/orders';
import type { FeedTab } from '@/types';

async function listReviewableOrders(): Promise<ordersApi.Order[]> {
  const reviewable: ordersApi.Order[] = [];
  let page = 1;
  for (let i = 0; i < 20; i += 1) {
    const data = await ordersApi.getMyOrders(page, 50);
    reviewable.push(...data.items.filter((order) => order.can_review));
    if (!data.next_page) break;
    page = data.next_page;
  }
  return reviewable;
}

function ReviewWriteButton() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [choices, setChoices] = useState<ordersApi.Order[] | null>(null);

  const openReview = async () => {
    setLoading(true);
    try {
      const reviewable = await listReviewableOrders();
      if (reviewable.length === 0) {
        toast.error('리뷰를 작성할 수 있는 배송 완료 주문이 없습니다.');
        return;
      }
      if (reviewable.length === 1) {
        navigate(`/orders/${reviewable[0].id}/review`);
        return;
      }
      setChoices(reviewable);
    } catch {
      toast.error('주문 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button loading={loading} onClick={() => void openReview()}>
        리뷰 작성하기
      </Button>
      <Modal
        isOpen={choices !== null}
        onClose={() => setChoices(null)}
        size="sm"
        showClose={false}
        className="w-full"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold">리뷰할 주문</h2>
            <p className="text-xs text-ig-text-secondary mt-1">배송이 완료된 주문을 선택하세요.</p>
          </div>
          <button
            type="button"
            onClick={() => setChoices(null)}
            className="text-sm text-ig-text-secondary hover:text-ig-text"
          >
            닫기
          </button>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto divide-y divide-ig-border border-t border-ig-border">
          {choices?.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                className="w-full text-left px-5 py-3.5 hover:bg-ig-hover"
                onClick={() => {
                  setChoices(null);
                  navigate(`/orders/${order.id}/review`);
                }}
              >
                <p className="text-sm font-semibold">
                  {order.product?.name || `주문 #${order.id}`}
                </p>
                <p className="text-xs text-ig-text-secondary mt-0.5">
                  {(order.delivered_at || order.created_at).slice(0, 10)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}

const emptyMessages: Record<
  FeedTab,
  { title: string; getDesc: (opts: { isAdmin: boolean; isAuthenticated: boolean }) => string }
> = {
  products: {
    title: '등록된 상품이 없습니다',
    getDesc: ({ isAdmin }) =>
      isAdmin
        ? '관리자 계정으로 수산물 상품을 등록하면 홈 피드에 표시됩니다.'
        : '판매자가 올린 수산물 상품이 여기에 표시됩니다.',
  },
  daily: {
    title: '소식이 없습니다',
    getDesc: ({ isAdmin }) =>
      isAdmin
        ? '포장 과정, 가게 모습, 진열 사진 등 가게 소식을 공유해 보세요.'
        : '판매자의 소식이 여기에 표시됩니다.',
  },
  reviews: {
    title: '리뷰가 없습니다',
    getDesc: ({ isAuthenticated }) =>
      isAuthenticated
        ? '배송 완료된 주문에서 사진 리뷰를 작성할 수 있습니다.'
        : '로그인 후 구매·배송 완료 시 리뷰를 작성할 수 있습니다.',
  },
};

export function HomePage() {
  const { posts, loading, feedTab, setFeedTab, feedHasMore, feedLoadingMore, loadMoreFeed, setCreatePostOpen } =
    useApp();
  const { user, isAuthenticated } = useAuth();

  const sentinelRef = useInfiniteScroll(() => {
    void loadMoreFeed();
  }, feedHasMore && !feedLoadingMore);

  if (loading) {
    return (
      <>
        <div className="feed-card mb-3 animate-pulse">
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
      </>
    );
  }

  const emptyMessage = emptyMessages[feedTab];
  const emptyDesc = emptyMessage.getDesc({
    isAdmin: Boolean(user?.is_admin),
    isAuthenticated,
  });

  return (
    <>
      <StoryBar />
      <FeedTabs activeTab={feedTab} onChange={setFeedTab} />

      {user?.is_admin && feedTab !== 'reviews' && (
        <div className="feed-card mb-3 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-xs text-ig-text-secondary">
            {feedTab === 'products' ? '새 수산물 상품을 등록하세요' : '가게 소식을 공유하세요'}
          </p>
          {feedTab === 'products' ? (
            <Link to="/admin/products">
              <Button size="sm">+ 상품 등록</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={() => setCreatePostOpen(true)}>
              + 소식 올리기
            </Button>
          )}
        </div>
      )}

      <SuggestedUsersStrip />

      {posts.length === 0 ? (
        <div className="feed-card py-20 px-6 text-center">
          <div className="mx-auto mb-4 flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-ig-text">
            <svg
              aria-hidden
              className="h-6 w-6 text-ig-text"
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
          <p className="text-sm text-ig-text-secondary leading-[18px]">{emptyDesc}</p>
          <div className="mt-6 flex justify-center">
            {feedTab === 'products' && user?.is_admin ? (
              <Link to="/admin/products">
                <Button>상품 등록하기</Button>
              </Link>
            ) : feedTab === 'daily' && user?.is_admin ? (
              <Button onClick={() => setCreatePostOpen(true)}>소식 올리기</Button>
            ) : feedTab === 'reviews' ? (
              isAuthenticated ? (
                <ReviewWriteButton />
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
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
          )}
        </div>
      )}
    </>
  );
}
