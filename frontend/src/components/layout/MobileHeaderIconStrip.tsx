import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, UserRound } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { ReelsIcon } from '@/components/common/ReelsIcon';
import { NavBadge } from '@/components/common/NavBadge';
import {
  NavHomeIcon,
  NavIcon,
  NavMessagesIcon,
  NavNotificationsIcon,
  NavSearchIcon,
} from '@/components/post/PostActionIcons';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadBadges } from '@/hooks/useUnreadBadges';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/utils/cn';

function isActivePath(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  if (to === '/search') return pathname === '/search' || pathname === '/explore';
  return pathname === to || pathname.startsWith(`${to}/`);
}

interface IconButtonProps {
  to: string;
  label: string;
  active: boolean;
  badge?: number;
  requiresAuth?: boolean;
  children: React.ReactNode;
}

function HeaderIconLink({ to, label, active, badge, requiresAuth, children }: IconButtonProps) {
  const navigate = useNavigate();
  const { requireAuth } = useRequireAuth();

  const className = cn(
    'relative flex h-10 min-w-[40px] shrink-0 items-center justify-center rounded-full transition-opacity',
    active ? 'text-ig-text' : 'text-ig-text-secondary hover:text-ig-text',
  );

  if (requiresAuth) {
    return (
      <button
        type="button"
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={className}
        onClick={() => requireAuth(() => navigate(to))}
      >
        {children}
        <NavBadge count={badge} className="-top-0.5 -right-0.5" />
      </button>
    );
  }

  return (
    <Link to={to} aria-label={label} aria-current={active ? 'page' : undefined} className={className}>
      {children}
      <NavBadge count={badge} className="-top-0.5 -right-0.5" />
    </Link>
  );
}

/** Mobile top header — seafood marketplace navigation */
export function MobileHeaderIconStrip() {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { messageCount, notificationCount } = useUnreadBadges();

  const profileTo = isAuthenticated && user ? `/profile/${user.username}` : '/login';

  return (
    <nav
      aria-label="주요 메뉴"
      className="flex items-center justify-around border-t border-ig-border px-1 h-[48px] w-full"
    >
      <HeaderIconLink to="/" label="현장피드" active={isActivePath(pathname, '/')} requiresAuth={false}>
        <NavHomeIcon active={isActivePath(pathname, '/')} />
      </HeaderIconLink>

      <HeaderIconLink to="/search" label="검색" active={isActivePath(pathname, '/search')} requiresAuth={false}>
        <NavSearchIcon active={isActivePath(pathname, '/search')} />
      </HeaderIconLink>

      <HeaderIconLink to="/reels" label="현장영상" active={isActivePath(pathname, '/reels')} requiresAuth={false}>
        <ReelsIcon size={24} filled={isActivePath(pathname, '/reels')} />
      </HeaderIconLink>

      <HeaderIconLink
        to="/messages"
        label="거래문의"
        active={isActivePath(pathname, '/messages')}
        badge={messageCount}
        requiresAuth
      >
        <NavMessagesIcon active={isActivePath(pathname, '/messages')} />
      </HeaderIconLink>

      <HeaderIconLink
        to="/notifications"
        label="알림"
        active={isActivePath(pathname, '/notifications')}
        badge={notificationCount}
        requiresAuth
      >
        <NavNotificationsIcon active={isActivePath(pathname, '/notifications')} />
      </HeaderIconLink>

      <HeaderIconLink
        to={profileTo}
        label="거래처"
        active={pathname.startsWith('/profile/')}
        requiresAuth={!isAuthenticated}
      >
        {isAuthenticated && user ? (
          <div
            className={cn(
              pathname.startsWith('/profile/') && 'ring-2 ring-ig-primary rounded-full p-[1px]',
            )}
          >
            <Avatar src={user.avatar_url} alt={user.username} size="xs" />
          </div>
        ) : (
          <NavIcon icon={UserRound} />
        )}
      </HeaderIconLink>

      <HeaderIconLink to="/settings" label="설정" active={pathname.startsWith('/settings')} requiresAuth>
        <NavIcon icon={Settings} className={pathname.startsWith('/settings') ? 'stroke-[2.5px]' : undefined} />
      </HeaderIconLink>
    </nav>
  );
}
