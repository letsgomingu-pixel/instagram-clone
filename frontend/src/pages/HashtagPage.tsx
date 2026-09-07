import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hash } from 'lucide-react';
import { MediaImage } from '@/components/common/MediaImage';
import { GridCommentIcon, GridLikeIcon } from '@/components/post/PostActionIcons';
import { useApp } from '@/contexts/AppContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import * as hashtagsApi from '@/api/hashtags';
import type { Post } from '@/types';
import { formatCount } from '@/utils/formatDate';

export function HashtagPage() {
  const { tag = '' } = useParams<{ tag: string }>();
  const { setSelectedPost } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    hashtagsApi
      .getHashtagPage(tag, 1)
      .then((data) => {
        if (cancelled) return;
        setPosts(data.items);
        setPostCount(data.post_count);
        setPage(1);
        setHasMore(data.next_page !== null);
      })
      .catch(() => {
        if (!cancelled) {
          setPosts([]);
          setPostCount(0);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tag]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    hashtagsApi
      .getHashtagPage(tag, nextPage)
      .then((data) => {
        setPosts((prev) => [...prev, ...data.items]);
        setPage(nextPage);
        setHasMore(data.next_page !== null);
      })
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, page, tag]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loadingMore);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 px-4 py-6 md:py-8">
        <div className="h-16 w-16 rounded-full bg-ig-secondary flex items-center justify-center shrink-0">
          <Hash size={28} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate"># {tag}</h1>
          <p className="text-sm text-ig-text-secondary">게시물 {formatCount(postCount)}개</p>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-ig-text-secondary text-center py-16">
          아직 #{tag} 태그가 달린 게시물이 없습니다.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-[2px] md:gap-1 max-w-[935px]">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelectedPost(post)}
                className="relative aspect-square group overflow-hidden bg-ig-secondary"
              >
                <MediaImage
                  src={post.image_url}
                  alt={post.caption || `#${tag} 게시물`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-semibold">
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

          {(hasMore || loadingMore) && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
