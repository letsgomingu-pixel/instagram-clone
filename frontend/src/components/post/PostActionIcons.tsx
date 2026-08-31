import {
  Home,
  LogIn,
  Menu,
  MoreHorizontal,
  PlusSquare,
  Search,
  Smile,
  type LucideIcon,
} from 'lucide-react';

import { ExploreIcon } from '@/components/common/ExploreIcon';
import {
  BookmarkOutlineIcon,
  BookmarkSolidIcon,
  CommentOutlineIcon,
  HeartOutlineIcon,
  HeartSolidIcon,
  SendOutlineIcon,
} from '@/components/common/InstagramActionIcons';

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
  if (liked) {
    return <HeartSolidIcon size={size} color="#ed4956" className={className} />;
  }
  return <HeartOutlineIcon size={size} color={inactiveStroke(tone)} className={className} />;
}

export function PostCommentIcon({ size = ACTION_ICON_SIZE, tone = 'default', className }: ActionIconBaseProps) {
  return <CommentOutlineIcon size={size} color={inactiveStroke(tone)} className={className} />;
}

export function PostShareIcon({ size = ACTION_ICON_SIZE, tone = 'default', className }: ActionIconBaseProps) {
  return <SendOutlineIcon size={size} color={inactiveStroke(tone)} className={className} />;
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
  if (saved) {
    return <BookmarkSolidIcon size={size} color={stroke} className={className} />;
  }
  return <BookmarkOutlineIcon size={size} color={stroke} className={className} />;
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
  return <HeartSolidIcon size={size} color="white" className={className} />;
}

export function GridCommentIcon({ size = GRID_ACTION_ICON_SIZE, className }: { size?: number; className?: string }) {
  return <CommentOutlineIcon size={size} color="white" className={className} />;
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

export function NavMessagesIcon({ className }: Omit<NavIconProps, 'icon' | 'filledWhenActive'>) {
  return <SendOutlineIcon size={ACTION_ICON_SIZE} color="currentColor" className={className} />;
}

export function NavNotificationsIcon({ active = false, className }: Omit<NavIconProps, 'icon' | 'filledWhenActive'>) {
  if (active) {
    return <HeartSolidIcon size={ACTION_ICON_SIZE} color="currentColor" className={className} />;
  }
  return <HeartOutlineIcon size={ACTION_ICON_SIZE} color="currentColor" className={className} />;
}

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
    return <HeartSolidIcon size={size} color="#ed4956" className={className} />;
  }
  return <HeartSolidIcon size={size} color="white" className={className} />;
}
