import { useParams, Navigate } from 'react-router-dom';
import { PostModal } from '@/components/post/PostModal';
import { useEffect, useState } from 'react';
import * as postsApi from '@/api/posts';
import type { Post } from '@/types';
export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = Number(postId);
    if (!id) return;
    postsApi
      .getPost(id)
      .then(setPost)
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  if (!post) return <Navigate to="/" replace />;

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      {post && (
        <PostModal post={post} onClose={() => window.history.back()} />
      )}
    </div>
  );}
