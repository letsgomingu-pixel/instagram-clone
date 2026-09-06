import { cn } from '@/utils/cn';

export function BrandIcon({ size = 28, className }: { size?: number; className?: string }) {
  if (size >= 48) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <rect width="512" height="512" fill="#000000" />
        <text
          x="256"
          y="268"
          textAnchor="middle"
          fontFamily="Georgia, 'DM Serif Display', serif"
          fontSize="38"
          fill="#0095FF"
        >
          i am not a fishmonger
        </text>
      </svg>
    );
  }

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
      <text
        x="16"
        y="23"
        textAnchor="middle"
        fontFamily="Georgia, 'DM Serif Display', serif"
        fontSize="22"
        fill="#0095FF"
      >
        i
      </text>
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
