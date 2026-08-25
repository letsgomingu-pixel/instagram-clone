import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { deleteAdminPost, getAdminPosts } from '@/api/admin';
import { MediaImage } from '@/components/common/MediaImage';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import type { Post } from '@/types';
import { formatRelativeTime } from '@/utils/formatDate';

export function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  const load = () => {
    setLoading(true);
    getAdminPosts(page, limit)
      .then((data) => {
        setPosts(data.items);
        setTotal(data.total);
      })
      .catch(() => toast.error('게시물 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  const handleDelete = async (post: Post) => {
    if (!window.confirm(`게시물 #${post.id}을(를) 삭제할까요?`)) return;
    try {
      await deleteAdminPost(post.id);
      toast.success('게시물이 삭제되었습니다.');
      load();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">게시물 관리</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white border border-ig-border rounded-xl overflow-hidden"
              >
                <div className="aspect-square bg-ig-secondary">
                  <MediaImage
                    src={post.image_url}
                    alt={post.caption || `게시물 ${post.id}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">@{post.user.username}</p>
                    <span className="text-xs text-ig-text-secondary shrink-0">#{post.id}</span>
                  </div>
                  {post.caption && (
                    <p className="text-xs text-ig-text-secondary line-clamp-2">{post.caption}</p>
                  )}
                  <p className="text-xs text-ig-text-secondary">
                    좋아요 {post.like_count.toLocaleString()} · 댓글 {post.comment_count.toLocaleString()}
                  </p>
                  <p className="text-xs text-ig-text-secondary">{formatRelativeTime(post.created_at)}</p>
                  <Button variant="secondary" size="sm" onClick={() => handleDelete(post)}>
                    삭제
                  </Button>
                </div>
              </article>
            ))}
          </div>

          {posts.length === 0 && (
            <p className="text-center text-sm text-ig-text-secondary py-12">게시물이 없습니다.</p>
          )}

          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-ig-text-secondary">총 {total.toLocaleString()}개</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                이전
              </Button>
              <span className="text-xs self-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
