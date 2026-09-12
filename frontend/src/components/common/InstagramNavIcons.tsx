import { cn } from '@/utils/cn';

/** Official Instagram nav glyphs — 48×48 viewBox, fill-based (not Lucide stroke). */

const VIEWBOX = '0 0 48 48';

interface NavGlyphProps {
  size?: number;
  className?: string;
}

function NavGlyph({
  size = 24,
  className,
  children,
}: NavGlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEWBOX}
      fill="currentColor"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Search — magnifying glass (same glyph when active/inactive on Instagram). */
const SEARCH_PATH =
  'M19 10.5A8.5 8.5 0 1 1 10.5 19 8.5 8.5 0 0 1 19 10.5zM19 9A10 10 0 1 0 29 19 10 10 0 0 0 19 9zM32.6 33.6l-9.2-9.2 1.5-1.5 9.2 9.2z';

/** Direct / Messages — paper plane. */
const DIRECT_PATH =
  'M47.8 3.8c-.3-.5-.8-.8-1.3-.8h-45C.9 3.1.3 3.5.1 4S0 5.2.4 5.7l15.9 15.6 5.5 22.6c.1.6.6 1 1.2 1.1h.2c.5 0 1-.3 1.3-.7l23.2-39c.4-.4.4-1 .1-1.5zM5.2 6.1h35.5L18 18.7 5.2 6.1zm18.7 33.6l-4.4-18.4L42.4 8.6 23.9 39.7z';

/** Notifications — heart outline (inactive). */
const HEART_OUTLINE_PATH =
  'M34.6 6.1c5.7 0 10.4 5.2 10.4 11.5 0 6.8-5.9 11-11.5 16S25 41.3 24 41.9c-1.1-.7-4.7-4-9.5-8.3-5.7-5-11.5-9.2-11.5-16C3 11.3 7.7 6.1 13.4 6.1c4.2 0 6.5 2 8.1 4.3 1.9 2.6 2.2 3.9 2.5 3.9.3 0 .6-1.3 2.5-3.9 1.6-2.3 3.9-4.3 8.1-4.3m0-3c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5.6 0 1.1-.2 1.6-.5 1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z';

/** Notifications — heart filled (active). */
const HEART_FILLED_PATH =
  'M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z';

/** Create — plain plus (no square border). */
const CREATE_H_PATH =
  'M36.3 25.5H11.7c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5h24.6c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5z';
const CREATE_V_PATH =
  'M24 37.8c-.8 0-1.5-.7-1.5-1.5V11.7c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v24.6c0 .8-.7 1.5-1.5 1.5z';

/** Reels — outer rounded square (48×48 nav glyph). */
const REELS_OUTER_PATH =
  'M34.833 4.5H13.167A6.667 6.667 0 0 0 6.5 11.167v25.666A6.667 6.667 0 0 0 13.167 43.5h21.666a6.667 6.667 0 0 0 6.666-6.667V11.167A6.667 6.667 0 0 0 34.833 4.5z';

/** Reels — inner cutout for outline ring. */
const REELS_INNER_PATH =
  'M15.667 9.167H32.333A2.167 2.167 0 0 1 34.5 11.333v25.334A2.167 2.167 0 0 1 32.333 38.833H15.667A2.167 2.167 0 0 1 13.5 36.667V11.333A2.167 2.167 0 0 1 15.667 9.167z';

/** Reels — play triangle. */
const REELS_PLAY_PATH = 'M24 33.833V14.167L32.667 24 24 33.833z';

const REELS_FILLED_PATH =
  'M34.833 4.5H13.167A6.667 6.667 0 0 0 6.5 11.167v25.666A6.667 6.667 0 0 0 13.167 43.5h21.666a6.667 6.667 0 0 0 6.666-6.667V11.167A6.667 6.667 0 0 0 34.833 4.5zM24 33.833V14.167L32.667 24 24 33.833z';

export function NavSearchGlyph({ size, className }: NavGlyphProps) {
  return (
    <NavGlyph size={size} className={className}>
      <path d={SEARCH_PATH} fillRule="evenodd" />
    </NavGlyph>
  );
}

export function NavMessagesGlyph({ size, className }: NavGlyphProps) {
  return (
    <NavGlyph size={size} className={className}>
      <path d={DIRECT_PATH} />
    </NavGlyph>
  );
}

export function NavNotificationsGlyph({
  size,
  className,
  filled = false,
}: NavGlyphProps & { filled?: boolean }) {
  return (
    <NavGlyph size={size} className={className}>
      <path d={filled ? HEART_FILLED_PATH : HEART_OUTLINE_PATH} />
    </NavGlyph>
  );
}

export function NavCreateGlyph({ size, className }: NavGlyphProps) {
  return (
    <NavGlyph size={size} className={className}>
      <path d={CREATE_H_PATH} />
      <path d={CREATE_V_PATH} />
    </NavGlyph>
  );
}

export function NavReelsGlyph({
  size,
  className,
  filled = false,
}: NavGlyphProps & { filled?: boolean }) {
  if (filled) {
    return (
      <NavGlyph size={size} className={className}>
        <path d={REELS_FILLED_PATH} fillRule="evenodd" />
      </NavGlyph>
    );
  }

  return (
    <NavGlyph size={size} className={className}>
      <path d={`${REELS_OUTER_PATH}${REELS_INNER_PATH}`} fillRule="evenodd" />
      <path d={REELS_PLAY_PATH} />
    </NavGlyph>
  );
}
