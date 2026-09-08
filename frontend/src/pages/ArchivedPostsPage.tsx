import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { ProfileGrid } from '@/components/profile/ProfileGrid';
import * as postsApi from '@/api/posts';
import { useApp } from '@/contexts/AppContext';
import type { Post } from '@/types';

export function ArchivedPostsPage() {
  const { user } = useAuth();
  const { unarchivePost } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(async (pageNum: number, append = false) => {
    const res = await postsApi.getArchivedPosts(pageNum);
    setPosts((prev) => (append ? [...prev, ...res.items] : res.items));
    setPage(pageNum);
    setHasMore(res.next_page !== null);
  }, []);

  useEffect(() => {
    loadPosts(1)
      .catch(() => toast.error('보관함을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [loadPosts]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadPosts(page + 1, true).catch(() => undefined);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, page, loadPosts]);

  const handleUnarchive = async (postId: number) => {
    try {
      await unarchivePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('게시물 보관이 해제되었습니다.');
    } catch {
      toast.error('보관 해제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  return (
    <div className="md:-mt-8">
      <div className="bg-white border-0 md:border border-ig-border md:rounded-lg overflow-hidden mb-4">
        <div className="px-4 py-4 border-b border-ig-border flex items-center gap-4">
          <Link to={`/profile/${user?.username ?? ''}`} className="text-ig-primary text-[14px] font-semibold">
            ← 프로필
          </Link>
          <h1 className="text-[16px] font-bold">보관함</h1>
        </div>
        <p className="px-4 py-3 text-[14px] text-ig-text-secondary border-b border-ig-border">
          보관한 게시물은 회원님만 볼 수 있습니다. 게시물을 탭하면 보관 해제할 수 있습니다.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-[14px] text-ig-text-secondary">보관된 게시물이 없습니다.</div>
      ) : (
        <>
          <ProfileGrid
            posts={posts}
            isOwn
            onPostClick={(post) => {
              if (window.confirm('이 게시물의 보관을 해제할까요?')) {
                void handleUnarchive(post.id);
              }
            }}
          />
          <div ref={loadMoreRef} className="h-8" />
        </>
      )}
    </div>
  );
}
