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
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-ig-primary" />
      <path
        d="M6 22c4-6 8-8 12-8s8 2 12 8"
        stroke="#90E0EF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 18c3-4 6-5 9-5s6 1 9 5"
        stroke="#CAF0F8"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <ellipse cx="16" cy="14" rx="5" ry="2.5" fill="#E8F6FA" />
      <path d="M11 14c0-2 2.2-3.5 5-3.5s5 1.5 5 3.5" stroke="#065A75" strokeWidth="1.2" />
      <circle cx="13.5" cy="13" r="0.8" fill="#065A75" />
      <path d="M19 12.5l2.5-1.2.8 1.6-2.8.6z" fill="#E07A5F" />
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
