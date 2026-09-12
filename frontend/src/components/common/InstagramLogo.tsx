import { cn } from '@/utils/cn';

const WORDMARK_VIEWBOX = { x: 90, y: 175, width: 340, height: 135 };

export function BrandIcon({ size = 28, className }: { size?: number; className?: string }) {
  if (size >= 48) {
    const width = Math.round(size * (WORDMARK_VIEWBOX.width / WORDMARK_VIEWBOX.height));
    return (
      <svg
        width={width}
        height={size}
        viewBox={`${WORDMARK_VIEWBOX.x} ${WORDMARK_VIEWBOX.y} ${WORDMARK_VIEWBOX.width} ${WORDMARK_VIEWBOX.height}`}
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <text
          x="256"
          y="228"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontSize="52"
          fontWeight="700"
          fill="#29ABE2"
        >
          i am not a
        </text>
        <text
          x="256"
          y="298"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontSize="52"
          fontWeight="700"
          fill="#29ABE2"
        >
          fishmonger
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
      <rect width="32" height="32" fill="#FFFFFF" />
      <text
        x="16"
        y="14"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="7"
        fontWeight="700"
        fill="#29ABE2"
      >
        i am not a
      </text>
      <text
        x="16"
        y="23"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="7"
        fontWeight="700"
        fill="#29ABE2"
      >
        fishmonger
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
