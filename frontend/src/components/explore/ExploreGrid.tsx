import { MediaImage } from '@/components/common/MediaImage';
import { GridCommentIcon, GridLikeIcon } from '@/components/post/PostActionIcons';
import { useApp } from '@/contexts/AppContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

export function ExploreGrid() {
  const {
    explorePosts,
    loading,
    exploreHasMore,
    exploreLoadingMore,
    loadMoreExplore,
    setSelectedPost,
  } = useApp();

  const sentinelRef = useInfiniteScroll(() => {
    void loadMoreExplore();
  }, exploreHasMore && !exploreLoadingMore);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-[2px] md:gap-1 max-w-[935px]">
        {explorePosts.map((post, index) => {
          const isLarge = index % 10 === 0 || index % 10 === 5;

          return (
            <button
              key={post.id}
              type="button"
              onClick={() => setSelectedPost(post)}
              className={`relative group overflow-hidden bg-ig-secondary ${
                isLarge ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
              }`}
            >
              <MediaImage
                src={post.image_url}
                alt={post.caption || '탐색 게시물'}
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
          );
        })}
      </div>

      {(exploreHasMore || exploreLoadingMore) && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
        </div>
      )}
    </>
  );
}
