import { useState, type RefObject } from 'react';
import { PostSmileIcon } from '@/components/post/PostActionIcons';
import { Button } from '@/components/common/Button';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface CommentInputProps {
  onSubmit: (content: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function CommentInput({ onSubmit, inputRef }: CommentInputProps) {
  const [content, setContent] = useState('');
  const { requireAuth, isAuthenticated } = useRequireAuth();

  const handleInteract = () => {
    if (!isAuthenticated) {
      requireAuth();
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    requireAuth(() => {
      onSubmit(content.trim());
      setContent('');
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-ig-border pt-3">
      <button type="button" aria-label="이모티콘" className="text-ig-text-secondary hover:text-ig-text">
        <PostSmileIcon />
      </button>
      <input
        ref={inputRef}
        type="text"
        placeholder={isAuthenticated ? '댓글 달기...' : '로그인하여 댓글을 남겨보세요...'}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={handleInteract}
        onClick={handleInteract}
        readOnly={!isAuthenticated}
        className="flex-1 text-sm placeholder:text-ig-text-secondary bg-transparent cursor-pointer"
      />
      <Button
        type="submit"
        variant="text"
        size="sm"
        disabled={!content.trim()}
        className="opacity-50 disabled:opacity-30 enabled:opacity-100"
      >
        게시
      </Button>
    </form>
  );
}
