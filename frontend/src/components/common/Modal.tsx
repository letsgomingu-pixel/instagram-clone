import { useEffect, type ReactNode } from 'react';
import { NavIcon } from '@/components/post/PostActionIcons';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  showClose?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-4xl',
  full: 'max-w-full h-full',
};

export function Modal({ isOpen, onClose, children, className, showClose = true, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/65" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 bg-white rounded-xl overflow-hidden shadow-xl',
          sizeMap[size],
          size === 'full' && 'rounded-none',
          className,
        )}
      >
        {showClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-1 text-white hover:opacity-70 md:text-ig-text"
            aria-label="닫기"
          >
            <NavIcon icon={X} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
