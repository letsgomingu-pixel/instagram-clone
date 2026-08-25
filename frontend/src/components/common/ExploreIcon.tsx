import { cn } from '@/utils/cn';

interface ExploreIconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

/** Instagram-style explore (탐색) glyph — circle with inner diamond */
export function ExploreIcon({ size = 24, className, filled = false }: ExploreIconProps) {
  if (filled) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={cn('shrink-0', className)}
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" fill="currentColor" />
        <path
          d="M13.941 13.953 7.581 16.424 10.06 10.078 16.419 7.607 13.941 13.953Z"
          fill="white"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.75} />
      <path
        d="M13.941 13.953 7.581 16.424 10.06 10.078 16.419 7.607 13.941 13.953Z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </svg>
  );
}
