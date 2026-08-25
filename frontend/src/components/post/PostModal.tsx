import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { MediaImage } from '@/components/common/MediaImage';
import { MultilineText } from '@/components/common/MultilineText';
import { TaggedUsers } from '@/components/post/TaggedUsers';
import {
  PostBookmarkIcon,
  PostCommentIcon,
  PostLikeIcon,
  PostMoreIcon,
  PostShareIcon,
} from '@/components/post/PostActionIcons';
import { CommentList } from '@/components/comment/CommentList';
import { CommentInput } from '@/components/comment/CommentInput';
import { formatRelativeTime } from '@/utils/formatDate';
import { useApp } from '@/contexts/AppContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Post } from '@/types';

interface PostModalProps {
  post: Post;
  onClose: () => void;
}

export function PostModal({ post, onClose }: PostModalProps) {
  const { toggleLike, toggleSave, addComment } = useApp();
  const { requireAuth } = useRequireAuth();
  const commentInputRef = useRef<HTMLInputElement>(null);

  const focusCommentInput = () => {
    requireAuth(() => commentInputRef.current?.focus());
  };

  return (
    <Modal isOpen onClose={onClose} size="lg" showClose={false} className="w-full max-w-[900px]">
      <div className="flex flex-col md:flex-row max-h-[90vh] md:max-h-[600px]">
        <div className="md:w-[60%] bg-black flex items-center justify-center min-h-[300px] md:min-h-0">
          <MediaImage
            src={post.image_url}
            alt={post.caption || '게시물'}
            className="max-w-full max-h-[600px] object-contain"
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
            <button aria-label="더보기" className="p-1">
              <PostMoreIcon />
            </button>
          </div>

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
            <CommentList comments={post.comments || []} />
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
                <button aria-label="공유">
                  <PostShareIcon />
                </button>
              </div>
              <button
                onClick={() => requireAuth(() => toggleSave(post.id))}
                aria-label="저장"
              >
                <PostBookmarkIcon saved={post.is_saved} />
              </button>
            </div>
            <p className="text-sm font-semibold mb-1">좋아요 {post.like_count.toLocaleString()}개</p>
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
    </Modal>
  );
}
