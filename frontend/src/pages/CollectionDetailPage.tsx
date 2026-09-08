import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProfileGrid } from '@/components/profile/ProfileGrid';
import * as collectionsApi from '@/api/collections';
import { useAuth } from '@/hooks/useAuth';
import type { Post } from '@/types';

export function CollectionDetailPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { user } = useAuth();
  const [collectionName, setCollectionName] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const id = Number(collectionId);

  const loadPosts = useCallback(
    async (pageNum: number, append = false) => {
      if (!id || Number.isNaN(id)) return;
      const res = await collectionsApi.getCollectionPosts(id, pageNum);
      setPosts((prev) => (append ? [...prev, ...res.items] : res.items));
      setPage(pageNum);
      setHasMore(res.next_page !== null);
    },
    [id],
  );

  useEffect(() => {
    if (!id || Number.isNaN(id)) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([collectionsApi.getCollections(), collectionsApi.getCollectionPosts(id, 1)])
      .then(([collections, postsRes]) => {
        if (cancelled) return;
        const col = collections.find((c) => c.id === id);
        setCollectionName(col?.name ?? '컬렉션');
        setPosts(postsRes.items);
        setPage(1);
        setHasMore(postsRes.next_page !== null);
      })
      .catch(() => {
        if (!cancelled) toast.error('컬렉션을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

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
          <Link to={`/profile/${user?.username ?? ''}?tab=saved`} className="text-ig-primary text-[14px] font-semibold">
            ← 저장됨
          </Link>
          <h1 className="text-[16px] font-bold truncate">{collectionName}</h1>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-[14px] text-ig-text-secondary">이 컬렉션에 저장된 게시물이 없습니다.</div>
      ) : (
        <>
          <ProfileGrid posts={posts} savedOnly isOwn />
          <div ref={loadMoreRef} className="h-8" />
        </>
      )}
    </div>
  );
}
