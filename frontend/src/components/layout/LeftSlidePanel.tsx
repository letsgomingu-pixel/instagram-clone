import type { ReactNode } from 'react';

interface LeftSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Instagram desktop slide panel — attached to sidebar, no dimming overlay. */
export function LeftSlidePanel({ isOpen, onClose, title, children }: LeftSlidePanelProps) {
  if (!isOpen) return null;

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="hidden md:flex fixed left-[var(--sidebar-width)] top-0 z-40 w-[var(--slide-panel-width)] h-full bg-ig-surface border-r border-ig-border flex-col animate-fade-in"
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
  );
}
