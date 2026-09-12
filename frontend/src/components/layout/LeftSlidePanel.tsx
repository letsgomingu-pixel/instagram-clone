import type { ReactNode } from 'react';

interface LeftSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function LeftSlidePanel({ isOpen, onClose, title, children }: LeftSlidePanelProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="hidden md:block fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="hidden md:flex fixed left-[245px] top-0 z-50 w-[397px] h-full bg-white border-r border-ig-border flex-col shadow-[4px_0_24px_rgba(0,0,0,0.07)] animate-fade-in"
      >
        <div className="flex items-center justify-between px-4 h-[60px] border-b border-ig-border shrink-0">
          <h2 className="text-[16px] font-bold text-ig-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-ig-text hover:opacity-60"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>
      </aside>
    </>
  );
}
