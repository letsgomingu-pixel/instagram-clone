/**
 * Hand-traced replicas of Instagram's actual action-bar glyphs (heart,
 * comment bubble, send/share paper plane, bookmark ribbon), instead of the
 * generic Lucide icon set. These four are the most-repeated, most-scrutinized
 * icons in the whole app (every single post, everywhere), so getting their
 * exact silhouette right matters more than any other visual detail.
 */

interface SvgIconProps {
  size?: number;
  className?: string;
  color?: string;
}

export function HeartOutlineIcon({ size = 24, className, color = 'currentColor' }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z" />
    </svg>
  );
}

export function HeartSolidIcon({ size = 24, className, color = '#E07A5F' }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z" />
    </svg>
  );
}

export function CommentOutlineIcon({ size = 24, className, color = 'currentColor' }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z"
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function SendOutlineIcon({ size = 24, className, color = 'currentColor' }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <line x1="22" y1="3" x2="9.218" y2="10.083" stroke={color} strokeLinejoin="round" strokeWidth="1.7" />
      <polygon
        points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334"
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function BookmarkOutlineIcon({ size = 24, className, color = 'currentColor' }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <polygon
        points="20 21 12 13.44 4 21 4 3 20 3 20 21"
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function BookmarkSolidIcon({ size = 24, className, color = 'currentColor' }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <polygon points="20 21 12 13.44 4 21 4 3 20 3 20 21" />
    </svg>
  );
}
