import { useState, type RefObject } from 'react';
import { PostSmileIcon } from '@/components/post/PostActionIcons';
import { EmojiPicker } from '@/components/comment/EmojiPicker';
import { Button } from '@/components/common/Button';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface CommentInputProps {
  onSubmit: (content: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  showTopBorder?: boolean;
}

export function CommentInput({ onSubmit, inputRef, showTopBorder = true }: CommentInputProps) {
  const [content, setContent] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
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
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 pt-3 ${showTopBorder ? 'border-t border-ig-border' : ''}`}
    >
      <div className="relative">
        <button
          type="button"
          aria-label="이모티콘"
          className="text-ig-text-secondary hover:text-ig-text"
          onClick={() => handleInteract() && setEmojiOpen((v) => !v)}
        >
          <PostSmileIcon />
        </button>
        <EmojiPicker
          open={emojiOpen}
          onClose={() => setEmojiOpen(false)}
          onSelect={(emoji) => setContent((c) => c + emoji)}
        />
      </div>
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
