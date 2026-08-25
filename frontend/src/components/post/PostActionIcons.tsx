import {
  Bookmark,
  Heart,
  Home,
  LogIn,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PlusSquare,
  Search,
  Send,
  Smile,
  type LucideIcon,
} from 'lucide-react';

import { ExploreIcon } from '@/components/common/ExploreIcon';

export const ACTION_ICON_SIZE = 24;
export const REEL_ACTION_ICON_SIZE = 28;
export const GRID_ACTION_ICON_SIZE = 20;

/** @deprecated use ACTION_ICON_SIZE */
export const POST_ACTION_ICON_SIZE = ACTION_ICON_SIZE;
/** @deprecated use GRID_ACTION_ICON_SIZE */
export const GRID_OVERLAY_ICON_SIZE = GRID_ACTION_ICON_SIZE;

type ActionIconTone = 'default' | 'reels';

function inactiveStroke(tone: ActionIconTone): string {
  return tone === 'reels' ? 'white' : 'currentColor';
}

interface ActionIconBaseProps {
  size?: number;
  tone?: ActionIconTone;
  className?: string;
}

interface PostLikeIconProps extends ActionIconBaseProps {
  liked: boolean;
}

export function PostLikeIcon({
  liked,
  size = ACTION_ICON_SIZE,
  tone = 'default',
  className,
}: PostLikeIconProps) {
  const color = liked ? '#ed4956' : inactiveStroke(tone);
  return (
    <Heart size={size} fill={liked ? '#ed4956' : 'none'} stroke={color} className={className} />
  );
}

export function PostCommentIcon({ size = ACTION_ICON_SIZE, tone = 'default', className }: ActionIconBaseProps) {
  return (
    <MessageCircle size={size} fill="none" stroke={inactiveStroke(tone)} className={className} />
  );
}

export function PostShareIcon({ size = ACTION_ICON_SIZE, tone = 'default', className }: ActionIconBaseProps) {
  return <Send size={size} fill="none" stroke={inactiveStroke(tone)} className={className} />;
}

interface PostBookmarkIconProps extends ActionIconBaseProps {
  saved: boolean;
}

export function PostBookmarkIcon({
  saved,
  size = ACTION_ICON_SIZE,
  tone = 'default',
  className,
}: PostBookmarkIconProps) {
  const stroke = inactiveStroke(tone);
  return (
    <Bookmark
      size={size}
      fill={saved ? stroke : 'none'}
      stroke={stroke}
      className={className}
    />
  );
}

export function PostMoreIcon({ size = ACTION_ICON_SIZE, tone = 'default', className }: ActionIconBaseProps) {
  return (
    <MoreHorizontal size={size} fill="none" stroke={inactiveStroke(tone)} className={className} />
  );
}

export function PostSmileIcon({ size = ACTION_ICON_SIZE, tone = 'default', className }: ActionIconBaseProps) {
  return <Smile size={size} fill="none" stroke={inactiveStroke(tone)} className={className} />;
}

export function GridLikeIcon({ size = GRID_ACTION_ICON_SIZE, className }: { size?: number; className?: string }) {
  return <Heart size={size} fill="white" stroke="white" className={className} />;
}

export function GridCommentIcon({ size = GRID_ACTION_ICON_SIZE, className }: { size?: number; className?: string }) {
  return <MessageCircle size={size} fill="none" stroke="white" className={className} />;
}

interface NavIconProps {
  icon: LucideIcon;
  active?: boolean;
  filledWhenActive?: boolean;
  className?: string;
}

export function NavIcon({ icon: Icon, active = false, filledWhenActive = false, className }: NavIconProps) {
  const stroke = 'currentColor';
  const fill = active && filledWhenActive ? stroke : 'none';
  return <Icon size={ACTION_ICON_SIZE} fill={fill} stroke={stroke} className={className} />;
}

export const NavHomeIcon = (props: Omit<NavIconProps, 'icon' | 'filledWhenActive'>) => (
  <NavIcon icon={Home} filledWhenActive {...props} />
);

export const NavSearchIcon = (props: Omit<NavIconProps, 'icon'>) => (
  <NavIcon icon={Search} {...props} />
);

export function NavExploreIcon({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  return <ExploreIcon size={ACTION_ICON_SIZE} filled={active} className={className} />;
}

export const NavCreateIcon = (props: Omit<NavIconProps, 'icon'>) => (
  <NavIcon icon={PlusSquare} {...props} />
);

export const NavMessagesIcon = (props: Omit<NavIconProps, 'icon'>) => (
  <NavIcon icon={Send} filledWhenActive {...props} />
);

export const NavNotificationsIcon = (props: Omit<NavIconProps, 'icon' | 'filledWhenActive'>) => (
  <NavIcon icon={Heart} filledWhenActive {...props} />
);

export const NavLoginIcon = (props: Omit<NavIconProps, 'icon'>) => (
  <NavIcon icon={LogIn} {...props} />
);

export const NavMenuIcon = (props: Omit<NavIconProps, 'icon'>) => (
  <NavIcon icon={Menu} {...props} />
);

export function DoubleTapHeartIcon({
  size = 80,
  tone = 'default',
  className,
}: {
  size?: number;
  tone?: ActionIconTone;
  className?: string;
}) {
  if (tone === 'reels') {
    return (
      <Heart
        size={size}
        fill="#ed4956"
        stroke="#ed4956"
        className={className}
      />
    );
  }
  return <Heart size={size} fill="white" stroke="white" className={className} />;
}
