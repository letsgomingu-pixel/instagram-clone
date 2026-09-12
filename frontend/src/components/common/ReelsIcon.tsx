import { NavReelsGlyph } from '@/components/common/InstagramNavIcons';

interface ReelsIconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

/** Instagram Reels nav glyph — rounded square + play (48×48 viewBox). */
export function ReelsIcon({ size = 24, className, filled = false }: ReelsIconProps) {
  return <NavReelsGlyph size={size} className={className} filled={filled} />;
}
