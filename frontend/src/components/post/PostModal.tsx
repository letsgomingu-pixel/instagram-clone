import { SaveCollectionModal } from '@/components/post/SaveCollectionModal';
import { useAuth } from '@/hooks/useAuth';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { MultilineText } from '@/components/common/MultilineText';
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
import { useApp } from '@/contexts/AppContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Post } from '@/types';

interface PostModalProps {
  post: Post;
  onClose: () => void;
}

export function PostModal({ post, onClose }: PostModalProps) {
  const { user } = useAuth();
  const {
    toggleLike,
    toggleSave,
    setPostSaved,
    addComment,
    setPostComments,
    setSelectedPost,
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
  const isOwnPost = user?.id === post.user.id;

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
      <div className="flex flex-col md:flex-row max-h-[90vh] md:max-h-[600px]">
        <div className="md:w-[60%] bg-black flex items-center justify-center min-h-[300px] md:min-h-0">
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

        <div className="md:w-[40%] flex flex-col border-l border-ig-border">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border">
            <Link to={`/profile/${post.user.username}`} className="flex items-center gap-3 min-w-0">
              <Avatar src={post.user.avatar_url} alt={post.user.username} size="sm" />
              <div className="min-w-0">
                <span className="text-sm font-semibold hover:underline">{post.user.username}</span>
                {post.tagged_users && post.tagged_users.length > 0 && (
                  <p className="text-[12px] truncate">
                    <TaggedUsers users={post.tagged_users} className="text-ig-text-secondary" />
                  </p>
                )}
              </div>
            </Link>
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

          {post.post_type === 'product' && post.product && (
            <ProductInfo product={post.product} showBuyButton showCartButton />
          )}

          {post.post_type === 'review' && (
            <div className="px-4 py-2 border-b border-ig-border bg-[#fafafa] space-y-1">
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

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {post.caption && (
              <div className="flex gap-3 mb-4">
                <Avatar src={post.user.avatar_url} alt={post.user.username} size="sm" />
                <div>
                  <p className="text-sm">
                    <Link to={`/profile/${post.user.username}`} className="font-semibold mr-1 hover:underline">
                      {post.user.username}
                    </Link>
                    <MultilineText as="span">{post.caption}</MultilineText>
                  </p>
                  <time className="text-[10px] text-ig-text-secondary uppercase">
                    {formatRelativeTime(post.created_at)}
                  </time>
                </div>
              </div>
            )}
            <CommentList
              comments={post.comments || []}
              postId={post.id}
              postOwnerId={post.user.id}
              onCommentsChange={(comments, total) =>
                setPostComments(post.id, comments, total ?? post.comment_count)
              }
            />
          </div>

          <div className="border-t border-ig-border px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => requireAuth(() => toggleLike(post.id))}
                  aria-label="좋아요"
                >
                  <PostLikeIcon liked={post.is_liked} />
                </button>
                <button onClick={focusCommentInput} aria-label="댓글">
                  <PostCommentIcon />
                </button>
                <button onClick={() => requireAuth(handleShare)} aria-label="공유">
                  <PostShareIcon />
                </button>
              </div>
              <button
                onClick={handleSave}
                aria-label="저장"
              >
                <PostBookmarkIcon saved={post.is_saved} />
              </button>
            </div>
            {(post.like_count > 0 || post.is_liked) && (
              <p className="text-sm font-semibold mb-1">좋아요 {post.like_count.toLocaleString()}개</p>
            )}
            {post.comment_count > 0 && (
              <p className="text-sm text-ig-text-secondary mb-1">
                댓글 {post.comment_count.toLocaleString()}개
              </p>
            )}
            <time className="text-[10px] text-ig-text-secondary uppercase block mb-3">
              {formatRelativeTime(post.created_at)}
            </time>
            <CommentInput inputRef={commentInputRef} onSubmit={(content) => addComment(post.id, content)} />
          </div>
        </div>
      </div>

      <button
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
