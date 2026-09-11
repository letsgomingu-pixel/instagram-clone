import { SaveCollectionModal } from '@/components/post/SaveCollectionModal';
import { useAuth } from '@/hooks/useAuth';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { MultilineText } from '@/components/common/MultilineText';
import { Spinner } from '@/components/common/Spinner';
import { PostMediaCarousel } from '@/components/post/PostMediaCarousel';
import { PostOptionsMenu } from '@/components/post/PostOptionsMenu';
import { TaggedUsers } from '@/components/post/TaggedUsers';
import {
  PostBookmarkIcon,
  PostCommentIcon,
  PostLikeIcon,
  PostShareIcon,
} from '@/components/post/PostActionIcons';
import { CommentList } from '@/components/comment/CommentList';
import { CommentInput } from '@/components/comment/CommentInput';
import { ProductInfo } from '@/components/post/ProductInfo';
import { formatRelativeTime } from '@/utils/formatDate';
import { formatCompactCount } from '@/utils/formatNumber';
import * as postsApi from '@/api/posts';
import { useApp } from '@/contexts/AppContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Post } from '@/types';

const COMMENT_PAGE_SIZE = 50;

interface PostModalProps {
  post: Post;
  onClose: () => void;
  focusComments?: boolean;
}

export function PostModal({ post, onClose, focusComments = false }: PostModalProps) {
  const { user } = useAuth();
  const {
    toggleLike,
    toggleSave,
    setPostSaved,
    addComment,
    setPostComments,
    deletePost,
    updatePost,
    archivePost,
    hidePost,
    reportPost,
    toggleFollow,
  } = useApp();
  const { requireAuth } = useRequireAuth();
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [savePickerOpen, setSavePickerOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const isOwnPost = user?.id === post.user.id;

  useEffect(() => {
    setCommentsLoading(true);
    postsApi
      .getPostComments(post.id, 1, COMMENT_PAGE_SIZE)
      .then((res) => {
        setPostComments(post.id, res.items, res.total);
        setNextPage(res.next_page);
      })
      .catch(() => toast.error('댓글을 불러오지 못했습니다.'))
      .finally(() => setCommentsLoading(false));
  }, [post.id, setPostComments]);

  useEffect(() => {
    if (!focusComments) return;
    const timer = window.setTimeout(() => commentInputRef.current?.focus(), 200);
    return () => window.clearTimeout(timer);
  }, [focusComments]);

  const loadMoreComments = useCallback(async () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await postsApi.getPostComments(post.id, nextPage, COMMENT_PAGE_SIZE);
      const merged = [...(post.comments || []), ...res.items];
      setPostComments(post.id, merged, res.total);
      setNextPage(res.next_page);
    } catch {
      toast.error('댓글을 더 불러오지 못했습니다.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextPage, post.comments, post.id, setPostComments]);

  const handleCommentsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      void loadMoreComments();
    }
  };

  const focusCommentInput = () => {
    requireAuth(() => commentInputRef.current?.focus());
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/p/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: `${post.user.username}의 게시물` });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('링크가 클립보드에 복사되었습니다.');
      }
    } catch {
      // User cancelled share
    }
  };

  const handleDelete = () => {
    requireAuth(() => {
      void deletePost(post.id)
        .then(() => {
          toast.success('게시물이 삭제되었습니다.');
          onClose();
        })
        .catch(() => toast.error('삭제에 실패했습니다.'));
    });
  };

  const handleArchive = async () => {
    await archivePost(post.id);
    onClose();
  };

  const handleSave = () => {
    requireAuth(() => {
      if (post.is_saved) toggleSave(post.id);
      else setSavePickerOpen(true);
    });
  };

  return (
    <Modal isOpen onClose={onClose} size="lg" showClose={false} className="w-full max-w-[900px]">
      <div className="flex flex-col md:flex-row md:h-[600px] max-h-[90vh] min-h-0">
        <div className="md:w-[60%] bg-black flex items-center justify-center min-h-[280px] md:min-h-0 shrink-0 md:shrink">
          <PostMediaCarousel
            media={
              post.media?.length
                ? post.media
                : [{ id: 0, media_url: post.image_url, media_type: 'image', position: 0 }]
            }
            alt={post.caption || '게시물'}
            onDoubleTap={() => requireAuth(() => toggleLike(post.id))}
          />
        </div>

        <div className="md:w-[40%] flex flex-col min-h-0 min-w-0 border-t md:border-t-0 md:border-l border-ig-border bg-white">
          <div className="shrink-0 flex items-center justify-between px-4 h-[60px] border-b border-ig-border">
            <div className="flex items-center gap-3 min-w-0">
              <Link to={`/profile/${post.user.username}`}>
                <Avatar src={post.user.avatar_url} alt={post.user.username} size="sm" />
              </Link>
              <div className="min-w-0 flex items-center flex-wrap gap-x-1">
                <Link
                  to={`/profile/${post.user.username}`}
                  className="text-[14px] font-semibold hover:underline truncate"
                >
                  {post.user.username}
                </Link>
                {!isOwnPost && !post.user.is_following && (
                  <>
                    <span className="text-ig-text-secondary">·</span>
                    <button
                      type="button"
                      onClick={() => requireAuth(() => toggleFollow(post.user.id))}
                      className="text-[14px] font-semibold text-ig-primary hover:text-ig-primary-hover"
                    >
                      팔로우
                    </button>
                  </>
                )}
                {post.tagged_users && post.tagged_users.length > 0 && (
                  <p className="w-full text-[12px] truncate">
                    <TaggedUsers users={post.tagged_users} className="text-ig-text-secondary" />
                  </p>
                )}
              </div>
            </div>
            <PostOptionsMenu
              post={post}
              onDelete={isOwnPost ? handleDelete : undefined}
              onEdit={isOwnPost ? (data) => updatePost(post.id, data) : undefined}
              onArchive={isOwnPost ? handleArchive : undefined}
              onHide={!isOwnPost ? () => hidePost(post.id).then(onClose) : undefined}
              onReport={!isOwnPost ? (reason) => reportPost(post.id, reason) : undefined}
              onUnfollow={post.user.is_following ? () => requireAuth(() => toggleFollow(post.user.id)) : undefined}
            />
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4"
            onScroll={handleCommentsScroll}
          >
            {post.caption && (
              <div className="flex gap-3 mb-4">
                <Link to={`/profile/${post.user.username}`}>
                  <Avatar src={post.user.avatar_url} alt={post.user.username} size="sm" />
                </Link>
                <div className="min-w-0">
                  <p className="text-[14px] leading-[18px]">
                    <Link
                      to={`/profile/${post.user.username}`}
                      className="font-semibold mr-1 hover:underline"
                    >
                      {post.user.username}
                    </Link>
                    <MultilineText as="span">{post.caption}</MultilineText>
                  </p>
                  <time className="text-[12px] text-ig-text-secondary mt-1 block">
                    {formatRelativeTime(post.created_at)}
                  </time>
                </div>
              </div>
            )}

            {post.post_type === 'product' && post.product && (
              <div className="mb-4">
                <ProductInfo product={post.product} showBuyButton showCartButton />
              </div>
            )}

            {post.post_type === 'review' && (
              <div className="mb-4 px-1 py-2 border border-ig-border rounded-lg bg-[#fafafa] space-y-1">
                {post.rating != null && (
                  <p className="text-[13px] font-semibold text-amber-600">
                    {'★'.repeat(post.rating)}{'☆'.repeat(5 - post.rating)}
                  </p>
                )}
                {post.product && (
                  <p className="text-[12px] text-ig-text-secondary">{post.product.name} 구매 리뷰</p>
                )}
              </div>
            )}

            {commentsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <>
                <CommentList
                  comments={post.comments || []}
                  postId={post.id}
                  postOwnerId={post.user.id}
                  onCommentsChange={(comments, total) =>
                    setPostComments(post.id, comments, total ?? post.comment_count)
                  }
                />
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-ig-border">
            <div className="px-4 pt-2 pb-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => requireAuth(() => toggleLike(post.id))}
                    aria-label="좋아요"
                    className="hover:opacity-50 transition-opacity"
                  >
                    <PostLikeIcon liked={post.is_liked} />
                  </button>
                  <button
                    type="button"
                    onClick={focusCommentInput}
                    aria-label="댓글"
                    className="hover:opacity-50 transition-opacity"
                  >
                    <PostCommentIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => requireAuth(handleShare)}
                    aria-label="공유"
                    className="hover:opacity-50 transition-opacity"
                  >
                    <PostShareIcon />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  aria-label="저장"
                  className="hover:opacity-50 transition-opacity"
                >
                  <PostBookmarkIcon saved={post.is_saved} />
                </button>
              </div>
              {(post.like_count > 0 || post.is_liked) && (
                <p className="text-[14px] font-semibold mb-1">
                  좋아요 {formatCompactCount(post.like_count)}개
                </p>
              )}
              <time className="text-[10px] text-ig-text-secondary uppercase block mb-2">
                {formatRelativeTime(post.created_at)}
              </time>
            </div>
            <div className="px-4 pb-3 border-t border-ig-border">
              <CommentInput
                inputRef={commentInputRef}
                showTopBorder={false}
                onSubmit={(content) => addComment(post.id, content)}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-20 text-white md:text-ig-text p-1 hover:opacity-70"
        aria-label="닫기"
      >
        ✕
      </button>

      <SaveCollectionModal
        postId={post.id}
        isOpen={savePickerOpen}
        onClose={() => setSavePickerOpen(false)}
        onSaved={() => setPostSaved(post.id, true)}
      />
    </Modal>
  );
}
