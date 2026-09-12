import { cn } from '@/utils/cn';

interface HomeIconProps {
  size?: number;
  className?: string;
  /** Active nav — solid filled house */
  filled?: boolean;
}

/**
 * Official Instagram home glyphs (48×48 viewBox).
 * Inactive uses a compound path (outer house + inner cutout) — not stroke.
 */
const HOME_FILLED_PATH =
  'M45.5 48H30.1c-.8 0-1.5-.7-1.5-1.5V34.2c0-2.6-2.1-4.6-4.6-4.6s-4.6 2.1-4.6 4.6v12.3c0 .8-.7 1.5-1.5 1.5H2.5c-.8 0-1.5-.7-1.5-1.5V23c0-.4.2-.8.4-1.1L22.9.4c.6-.6 1.6-.6 2.1 0l21.5 21.5c.3.3.4.7.4 1.1v23.5c.1.8-.6 1.5-1.4 1.5z';

const HOME_OUTLINE_PATH =
  'M45.3 48H30c-.8 0-1.5-.7-1.5-1.5V34.2c0-2.6-2-4.6-4.6-4.6s-4.6 2-4.6 4.6v12.3c0 .8-.7 1.5-1.5 1.5H2.5c-.8 0-1.5-.7-1.5-1.5V23c0-.4.2-.8.4-1.1L22.9 4c.6-.6 1.5-.6 2.1 0l21.5 21.5c.4.4.6 1.1.3 1.6 0 .1-.1.1-.1.2v22.8c.1.8-.6 1.5-1.4 1.5zm-13.8-3h12.3V23.4L24 3.6l-20 20V45h12.3V34.2c0-4.3 3.3-7.6 7.6-7.6s7.6 3.3 7.6 7.6V45z';

export function HomeIcon({ size = 24, className, filled = false }: HomeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="currentColor"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <path d={filled ? HOME_FILLED_PATH : HOME_OUTLINE_PATH} fillRule="evenodd" />
    </svg>
  );
}
