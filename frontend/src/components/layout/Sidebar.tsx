import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import {
  NavCreateIcon,
  NavHomeIcon,
  NavLoginIcon,
  NavMenuIcon,
  NavMessagesIcon,
  NavNotificationsIcon,
  NavSearchIcon,
} from '@/components/post/PostActionIcons';
import { ReelsIcon } from '@/components/common/ReelsIcon';
import { NavBadge } from '@/components/common/NavBadge';
import { Package, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUnreadBadges } from '@/hooks/useUnreadBadges';
import { cn } from '@/utils/cn';
import { InstagramLogo } from '@/components/common/InstagramLogo';

type NavItem =
  | { kind: 'link'; to: string; label: string; renderIcon: (active: boolean) => React.ReactNode }
  | { kind: 'notifications'; label: string; renderIcon: (active: boolean) => React.ReactNode }
  | { kind: 'create'; label: string; renderIcon: () => React.ReactNode };

const navItems: NavItem[] = [
  { kind: 'link', to: '/', label: '홈', renderIcon: (active) => <NavHomeIcon active={active} /> },
  { kind: 'link', to: '/reels', label: '릴스', renderIcon: (active) => <ReelsIcon size={24} filled={active} /> },
  { kind: 'link', to: '/messages', label: '메시지', renderIcon: (active) => <NavMessagesIcon active={active} /> },
  { kind: 'link', to: '/search', label: '검색', renderIcon: (active) => <NavSearchIcon active={active} /> },
  { kind: 'notifications', label: '알림', renderIcon: (active) => <NavNotificationsIcon active={active} /> },
  { kind: 'create', label: '만들기', renderIcon: () => <NavCreateIcon /> },
];

function navButtonClass(active: boolean) {
  return cn(
    'flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-ig-secondary transition-colors w-full text-left',
    active && 'font-bold',
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const {
    setCreatePostOpen,
    setNotificationsPanelOpen,
    isNotificationsPanelOpen,
  } = useApp();
  const { requireAuth } = useRequireAuth();
  const { messageCount, notificationCount } = useUnreadBadges();

  const handleCreate = () => requireAuth(() => setCreatePostOpen(true));

  const handleNotifications = () => {
    requireAuth(() => {
      if (window.matchMedia('(min-width: 768px)').matches) {
        setNotificationsPanelOpen(!isNotificationsPanelOpen);
      } else {
        navigate('/notifications');
      }
    });
  };

  const visibleNavItems = navItems.filter(
    (item) => item.kind !== 'create' || user?.is_admin,
  );

  const panelOpen = isNotificationsPanelOpen;
  const isNotificationsActive =
    isNotificationsPanelOpen || location.pathname.startsWith('/notifications');

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-[var(--sidebar-width)] border-r border-ig-border bg-ig-surface flex-col px-3 py-8 z-50">
      <NavLink to="/" className="px-3 mb-6">
        <InstagramLogo className="text-[16px] leading-tight text-center hidden lg:block" />
        <div className="lg:hidden flex justify-center">
          <InstagramLogo className="text-[16px] leading-tight text-center" />
        </div>
      </NavLink>

      <nav className="flex flex-col gap-1 flex-1">
        {visibleNavItems.map((item) => {
          if (item.kind === 'create') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={handleCreate}
                className={navButtonClass(false)}
                aria-label={item.label}
              >
                {item.renderIcon()}
                <span className="text-base hidden lg:inline">{item.label}</span>
              </button>
            );
          }

          if (item.kind === 'notifications') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={handleNotifications}
                className={cn(navButtonClass(isNotificationsActive), 'relative')}
                aria-label={item.label}
              >
                <span className="relative">
                  {item.renderIcon(isNotificationsActive)}
                  <NavBadge count={notificationCount} />
                </span>
                <span className="text-base hidden lg:inline">{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setNotificationsPanelOpen(false)}
              className={({ isActive }) => navButtonClass(isActive && !panelOpen)}
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    {item.renderIcon(isActive && !panelOpen)}
                    {item.to === '/messages' && <NavBadge count={messageCount} />}
                  </span>
                  <span className="text-base hidden lg:inline">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}

        {isAuthenticated && (
          <>
            <NavLink
              to="/cart"
              onClick={() => setNotificationsPanelOpen(false)}
              className={({ isActive }) => cn(navButtonClass(isActive), 'mt-2')}
            >
              <ShoppingCart size={24} />
              <span className="text-base hidden lg:inline">장바구니</span>
            </NavLink>
            <NavLink
              to="/orders"
              onClick={() => setNotificationsPanelOpen(false)}
              className={({ isActive }) => navButtonClass(isActive)}
            >
              <Package size={24} />
              <span className="text-base hidden lg:inline">내 주문</span>
            </NavLink>
          </>
        )}

        {isAuthenticated ? (
          <NavLink
            to={`/profile/${user?.username}`}
            onClick={() => setNotificationsPanelOpen(false)}
            className={({ isActive }) => cn(navButtonClass(isActive), 'mt-auto')}
          >
            <Avatar src={user?.avatar_url} alt="프로필" size="sm" />
            <span className="text-base hidden lg:inline truncate">프로필</span>
          </NavLink>
        ) : (
          <Link
            to="/login"
            className={cn(navButtonClass(false), 'mt-auto text-ig-primary')}
          >
            <NavLoginIcon />
            <span className="text-base hidden lg:inline font-semibold">로그인</span>
          </Link>
        )}
      </nav>

      <Link
        to="/settings"
        onClick={() => setNotificationsPanelOpen(false)}
        className={navButtonClass(false)}
      >
        <NavMenuIcon />
        <span className="text-base hidden lg:inline">더 보기</span>
      </Link>
    </aside>
  );
}
