import { useState } from 'react';
import { PostSmileIcon } from '@/components/post/PostActionIcons';
import { Button } from '@/components/common/Button';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface FeedCommentInputProps {
  onSubmit: (content: string) => void;
}

export function FeedCommentInput({ onSubmit }: FeedCommentInputProps) {
  const [content, setContent] = useState('');
  const { requireAuth, isAuthenticated } = useRequireAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    requireAuth(() => {
      onSubmit(content.trim());
      setContent('');
    });
  };

  const handleFocus = () => {
    if (!isAuthenticated) requireAuth();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-ig-border pt-3 mt-1">
      <input
        type="text"
        placeholder={isAuthenticated ? '댓글 달기...' : '로그인하여 댓글을 남겨보세요...'}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={handleFocus}
        onClick={handleFocus}
        readOnly={!isAuthenticated}
        className="flex-1 min-w-0 text-[14px] placeholder:text-ig-text-secondary bg-transparent outline-none"
      />
      <button type="button" className="shrink-0 opacity-80 hover:opacity-50" aria-label="이모티콘">
        <PostSmileIcon />
      </button>
      <Button
        type="submit"
        variant="text"
        size="sm"
        disabled={!content.trim()}
        className="text-[14px] shrink-0 opacity-50 disabled:opacity-30 enabled:opacity-100 px-0"
      >
        게시
      </Button>
    </form>
  );
}
