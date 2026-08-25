import { cn } from '@/utils/cn';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-ig-primary text-white hover:bg-ig-primary-hover disabled:opacity-50',
    secondary: 'bg-ig-secondary text-ig-text hover:bg-[#dbdbdb]',
    text: 'text-ig-primary hover:text-ig-primary-hover bg-transparent',
    danger: 'bg-ig-red text-white hover:opacity-90',
  };

  const sizes = {
    sm: 'h-7 px-3 text-xs font-semibold rounded-lg',
    md: 'h-8 px-4 text-sm font-semibold rounded-lg',
    lg: 'h-[44px] px-4 text-sm font-semibold rounded-lg',
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
