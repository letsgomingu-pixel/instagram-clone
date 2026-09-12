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
        className="hidden md:block fixed inset-0 z-40 bg-ig-text/15 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="hidden md:flex fixed left-[245px] top-0 z-50 w-[397px] h-full bg-ig-surface border-r border-ig-border/80 flex-col shadow-[4px_0_32px_rgba(41,171,226,0.12)] animate-fade-in"
      >
        <div className="flex items-center justify-between px-5 h-[60px] border-b border-ig-border/80 shrink-0 bg-ig-bg/50">
          <h2 className="text-[16px] font-semibold text-ig-text tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ig-text-secondary hover:text-ig-text hover:bg-ig-hover transition-colors"
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
