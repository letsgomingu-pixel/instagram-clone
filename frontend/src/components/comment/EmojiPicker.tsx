import { useEffect, useRef } from 'react';

const EMOJIS = [
  '😀', '😂', '🥰', '😍', '😊', '😎', '🤔', '😢', '😡', '👍',
  '👏', '🙏', '💯', '🔥', '❤️', '💙', '🎉', '✨', '🐟', '🦐',
  '🍣', '🍱', '🦑', '🦞', '🦀', '🐙', '🌊', '⭐', '💬', '👀',
];

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ open, onClose, onSelect, className }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`absolute bottom-full mb-2 left-0 z-50 grid grid-cols-5 gap-1 p-2 bg-ig-surface border border-ig-border rounded-xl shadow-lg ${className ?? ''}`}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="text-xl p-1.5 rounded hover:bg-ig-secondary"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
