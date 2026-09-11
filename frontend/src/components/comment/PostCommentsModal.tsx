import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CommentInput } from '@/components/comment/CommentInput';
import { CommentList } from '@/components/comment/CommentList';
import { Spinner } from '@/components/common/Spinner';
import * as postsApi from '@/api/posts';
import { useApp } from '@/contexts/AppContext';
import type { Comment, Post } from '@/types';

interface PostCommentsModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 50;

export function PostCommentsModal({ post, isOpen, onClose }: PostCommentsModalProps) {
  const { addComment, setPostComments } = useApp();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(post.comment_count);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);

    setLoading(true);
    postsApi
      .getPostComments(post.id, 1, PAGE_SIZE)
      .then((res) => {
        setComments(res.items);
        setTotal(res.total);
        setNextPage(res.next_page);
        setPostComments(post.id, res.items, res.total);
      })
      .catch(() => toast.error('댓글을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));

    const focusTimer = window.setTimeout(() => commentInputRef.current?.focus(), 200);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, onClose, post.id, setPostComments]);

  const loadMore = useCallback(async () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await postsApi.getPostComments(post.id, nextPage, PAGE_SIZE);
      setComments((prev) => {
        const merged = [...prev, ...res.items];
        setPostComments(post.id, merged, res.total);
        return merged;
      });
      setTotal(res.total);
      setNextPage(res.next_page);
    } catch {
      toast.error('댓글을 더 불러오지 못했습니다.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextPage, post.id, setPostComments]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      void loadMore();
    }
  };

  const handleCommentsChange = (next: Comment[], nextTotal?: number) => {
    setComments(next);
    const count = nextTotal ?? total;
    setTotal(count);
    setPostComments(post.id, next, count);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/65" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="댓글"
        className="relative z-10 w-full md:max-w-[400px] bg-white rounded-t-2xl md:rounded-xl shadow-xl flex flex-col max-h-[min(85dvh,640px)] md:max-h-[min(70vh,560px)]"
      >
        <div className="shrink-0 pt-2 md:pt-0">
          <div className="mx-auto mb-1 h-1 w-9 rounded-full bg-ig-border md:hidden" aria-hidden="true" />
          <div className="flex items-center justify-center border-b border-ig-border h-[44px] relative px-4">
            <h2 className="text-[16px] font-semibold">댓글</h2>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 p-1 text-ig-text hover:opacity-60"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3"
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <CommentList
                comments={comments}
                postId={post.id}
                postOwnerId={post.user.id}
                onCommentsChange={handleCommentsChange}
              />
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-ig-border px-4 pb-[max(12px,env(safe-area-inset-bottom))] md:pb-3 bg-white">
          <CommentInput
            inputRef={commentInputRef}
            onSubmit={(content) => addComment(post.id, content)}
          />
        </div>
      </div>
    </div>
  );
}
