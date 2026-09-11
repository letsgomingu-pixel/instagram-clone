import { Link } from 'react-router-dom';
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/common/Avatar';
import { LikeListModal } from '@/components/post/LikeListModal';
import { PostCaption } from '@/components/post/PostCaption';
import { PostMediaCarousel } from '@/components/post/PostMediaCarousel';
import { ProductInfo } from '@/components/post/ProductInfo';
import { PostOptionsMenu } from '@/components/post/PostOptionsMenu';
import {
  DoubleTapHeartIcon,
  PostBookmarkIcon,
  PostCommentIcon,
  PostLikeIcon,
  PostShareIcon,
} from '@/components/post/PostActionIcons';
import { formatRelativeTime } from '@/utils/formatDate';
import { formatCompactCount } from '@/utils/formatNumber';
import { useApp } from '@/contexts/AppContext';
import { SaveCollectionModal } from '@/components/post/SaveCollectionModal';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const {
    toggleLike,
    toggleSave,
    setPostSaved,
    setSelectedPost,
    toggleFollow,
    deletePost,
    updatePost,
    archivePost,
    hidePost,
    reportPost,
  } = useApp();
  const { requireAuth } = useRequireAuth();
  const [showHeart, setShowHeart] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [savePickerOpen, setSavePickerOpen] = useState(false);
  const isOwnPost = user?.id === post.user.id;

  const openComments = () => setSelectedPost(post, true);

  const handleDoubleTapLike = useCallback(() => {
    requireAuth(() => {
      if (!post.is_liked) toggleLike(post.id);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    });
  }, [post.id, post.is_liked, toggleLike, requireAuth]);

  const handleLike = () => {
    requireAuth(() => {
      if (!post.is_liked) {
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 450);
      }
      toggleLike(post.id);
    });
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
      // User cancelled share or clipboard failed silently
    }
  };

  const handleUnfollow = () => {
    requireAuth(() => toggleFollow(post.user.id));
  };

  const handleDelete = () => {
    requireAuth(() => {
      void deletePost(post.id)
        .then(() => toast.success('게시물이 삭제되었습니다.'))
        .catch(() => toast.error('삭제에 실패했습니다.'));
    });
  };

  const handleSave = () => {
    requireAuth(() => {
      if (post.is_saved) {
        toggleSave(post.id);
      } else {
        setSavePickerOpen(true);
      }
    });
  };

  return (
    <article className="group feed-card">
      <header className="flex items-center justify-between px-4 py-[14px]">
        <Link to={`/profile/${post.user.username}`} className="flex items-center gap-3 min-w-0">
          <Avatar src={post.user.avatar_url} alt={post.user.username} size="sm" />
          <div className="min-w-0 leading-tight">
            <span className="text-[14px] font-semibold hover:underline block truncate">
              {post.user.username}
            </span>
            {post.location && (
              <p className="text-[12px] text-ig-text truncate">{post.location}</p>
            )}
          </div>
        </Link>
        <PostOptionsMenu
          post={post}
          onUnfollow={post.user.is_following ? handleUnfollow : undefined}
          onDelete={isOwnPost ? handleDelete : undefined}
          onEdit={isOwnPost ? (data) => updatePost(post.id, data) : undefined}
          onArchive={isOwnPost ? () => archivePost(post.id) : undefined}
          onHide={!isOwnPost ? () => hidePost(post.id) : undefined}
          onReport={!isOwnPost ? (reason) => reportPost(post.id, reason) : undefined}
        />
      </header>

      <PostMediaCarousel
        media={
          post.media?.length
            ? post.media
            : [{ id: 0, media_url: post.image_url, media_type: 'image', position: 0 }]
        }
        alt={post.caption || `${post.user.username}의 게시물`}
        onDoubleTap={handleDoubleTapLike}
        showHeart={showHeart}
        heartIcon={<DoubleTapHeartIcon className="animate-heart-pop drop-shadow-lg" />}
      />

      {post.post_type === 'product' && post.product && (
        <ProductInfo product={post.product} showBuyButton showCartButton />
      )}

      {post.post_type === 'review' && (
        <div className="px-4 py-2 border-t border-ig-border bg-[#fafafa] space-y-1">
          {post.rating != null && (
            <p className="text-[13px] font-semibold text-amber-600">
              {'★'.repeat(post.rating)}{'☆'.repeat(5 - post.rating)}
            </p>
          )}
          {post.product && (
            <p className="text-[12px] text-ig-text-secondary">
              {post.product.name} 구매 리뷰
            </p>
          )}
        </div>
      )}

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleLike}
                aria-label={post.is_liked ? '좋아요 취소' : '좋아요'}
                className="hover:opacity-50 transition-opacity active:scale-95"
              >
                <PostLikeIcon liked={post.is_liked} className={likeAnimating ? 'animate-like-bounce' : ''} />
              </button>
              {(post.like_count > 0 || post.is_liked) && (
                <button
                  type="button"
                  onClick={() => setLikesOpen(true)}
                  className="text-[14px] font-semibold leading-none hover:opacity-60"
                  aria-label={`좋아요 ${post.like_count}개`}
                >
                  {formatCompactCount(post.like_count)}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={openComments}
                aria-label="댓글"
                className="hover:opacity-50 transition-opacity active:scale-95"
              >
                <PostCommentIcon />
              </button>
              {post.comment_count > 0 && (
                <button
                  type="button"
                  onClick={openComments}
                  className="text-[14px] font-semibold leading-none hover:opacity-60"
                  aria-label={`댓글 ${post.comment_count}개`}
                >
                  {formatCompactCount(post.comment_count)}
                </button>
              )}
            </div>
            <button
              onClick={() => requireAuth(handleShare)}
              aria-label="공유"
              className="hover:opacity-50 transition-opacity active:scale-95"
            >
              <PostShareIcon />
            </button>
          </div>
          <button
            onClick={handleSave}
            aria-label={post.is_saved ? '저장 취소' : '저장'}
            className="hover:opacity-50 transition-opacity active:scale-95"
          >
            <PostBookmarkIcon saved={post.is_saved} />
          </button>
        </div>

        {post.caption && <PostCaption username={post.user.username} caption={post.caption} />}

        <time
          dateTime={post.created_at}
          className="text-[10px] text-ig-text-secondary block mt-1 uppercase"
        >
          {formatRelativeTime(post.created_at)}
        </time>
      </div>

      <LikeListModal
        postId={post.id}
        likeCount={post.like_count}
        isOpen={likesOpen}
        onClose={() => setLikesOpen(false)}
      />

      <SaveCollectionModal
        postId={post.id}
        isOpen={savePickerOpen}
        onClose={() => setSavePickerOpen(false)}
        onSaved={() => setPostSaved(post.id, true)}
      />
    </article>
  );
}
