import { Link } from 'react-router-dom';
import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/common/Avatar';
import { FeedCommentInput } from '@/components/post/FeedCommentInput';
import { LikeListModal } from '@/components/post/LikeListModal';
import { PostCaption } from '@/components/post/PostCaption';
import { MultilineText } from '@/components/common/MultilineText';
import { PostMediaCarousel } from '@/components/post/PostMediaCarousel';
import { PostOptionsMenu } from '@/components/post/PostOptionsMenu';
import {
  DoubleTapHeartIcon,
  PostBookmarkIcon,
  PostCommentIcon,
  PostLikeIcon,
  PostShareIcon,
} from '@/components/post/PostActionIcons';
import { formatRelativeTime } from '@/utils/formatDate';
import { useApp } from '@/contexts/AppContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
  onOpenModal?: () => void;
}

export function PostCard({ post, onOpenModal }: PostCardProps) {
  const { toggleLike, toggleSave, setSelectedPost, addComment, toggleFollow } = useApp();
  const { requireAuth } = useRequireAuth();
  const [showHeart, setShowHeart] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const lastTap = useRef(0);

  const previewComments = (post.comments || []).slice(-2);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      requireAuth(() => {
        if (!post.is_liked) toggleLike(post.id);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);
      });
    }
    lastTap.current = now;
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

  const openModal = () => {
    setSelectedPost(post);
    onOpenModal?.();
  };

  const handleUnfollow = () => {
    requireAuth(() => toggleFollow(post.user.id));
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
        <PostOptionsMenu post={post} onUnfollow={handleUnfollow} />
      </header>

      <PostMediaCarousel
        media={
          post.media?.length
            ? post.media
            : [{ id: 0, media_url: post.image_url, media_type: 'image', position: 0 }]
        }
        alt={post.caption || `${post.user.username}의 게시물`}
        onDoubleTap={handleDoubleTap}
        showHeart={showHeart}
        heartIcon={<DoubleTapHeartIcon className="animate-heart-pop drop-shadow-lg" />}
      />

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              aria-label={post.is_liked ? '좋아요 취소' : '좋아요'}
              className="hover:opacity-50 transition-opacity active:scale-95"
            >
              <PostLikeIcon liked={post.is_liked} className={likeAnimating ? 'animate-like-bounce' : ''} />
            </button>
            <button
              onClick={openModal}
              aria-label="댓글"
              className="hover:opacity-50 transition-opacity active:scale-95"
            >
              <PostCommentIcon />
            </button>
            <button
              onClick={() => requireAuth(handleShare)}
              aria-label="공유"
              className="hover:opacity-50 transition-opacity active:scale-95"
            >
              <PostShareIcon />
            </button>
          </div>
          <button
            onClick={() => requireAuth(() => toggleSave(post.id))}
            aria-label={post.is_saved ? '저장 취소' : '저장'}
            className="hover:opacity-50 transition-opacity active:scale-95"
          >
            <PostBookmarkIcon saved={post.is_saved} />
          </button>
        </div>

        {post.like_count > 0 && (
          <button
            type="button"
            onClick={() => setLikesOpen(true)}
            className="text-[14px] font-semibold mb-1 hover:underline text-left"
          >
            좋아요 {post.like_count.toLocaleString()}개
          </button>
        )}

        {post.caption && <PostCaption username={post.user.username} caption={post.caption} />}

        {post.comment_count > 2 && (
          <button
            onClick={openModal}
            className="text-[14px] text-ig-text-secondary mb-1 hover:underline block"
          >
            댓글 {post.comment_count.toLocaleString()}개 모두 보기
          </button>
        )}

        {previewComments.map((comment) => (
          <div key={comment.id} className="text-[14px] mb-1 leading-[18px]">
            <Link
              to={`/profile/${comment.user.username}`}
              className="font-semibold mr-1 hover:underline"
            >
              {comment.user.username}
            </Link>
            <MultilineText as="span">{comment.content}</MultilineText>
          </div>
        ))}

        <time
          dateTime={post.created_at}
          className="text-[10px] text-ig-text-secondary block mt-1 mb-1"
        >
          {formatRelativeTime(post.created_at)}
        </time>

        <FeedCommentInput onSubmit={(content) => addComment(post.id, content)} />
      </div>

      <LikeListModal
        postId={post.id}
        likeCount={post.like_count}
        isOpen={likesOpen}
        onClose={() => setLikesOpen(false)}
      />
    </article>
  );
}
