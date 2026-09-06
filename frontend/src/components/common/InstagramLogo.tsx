import { cn } from '@/utils/cn';

export function BrandIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" fill="#000000" />
      <rect x="14" y="7" width="4" height="4" fill="#0095FF" />
      <rect x="14" y="13" width="4" height="12" rx="1" fill="#0095FF" />
    </svg>
  );
}

export function InstagramLogo({ className = 'text-3xl' }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center select-none text-ig-text font-brand leading-tight', className)}>
      i am not a fishmonger
    </span>
  );
}

/** @deprecated Use BrandIcon — kept for imports that reference InstagramIcon */
export function InstagramIcon({ size = 24, className }: { size?: number; className?: string }) {
  return <BrandIcon size={size} className={className} />;
}
