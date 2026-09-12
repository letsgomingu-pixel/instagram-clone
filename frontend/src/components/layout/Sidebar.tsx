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
  | { kind: 'link'; to: string; label: string; isReels?: boolean; renderIcon: (active: boolean) => React.ReactNode }
  | { kind: 'search'; label: string; renderIcon: (active: boolean) => React.ReactNode }
  | { kind: 'notifications'; label: string; renderIcon: (active: boolean) => React.ReactNode }
  | { kind: 'create'; label: string; renderIcon: () => React.ReactNode };

const navItems: NavItem[] = [
  { kind: 'link', to: '/', label: '홈', renderIcon: (active) => <NavHomeIcon active={active} /> },
  { kind: 'link', to: '/reels', label: '릴스', isReels: true, renderIcon: (active) => <ReelsIcon size={24} filled={active} /> },
  { kind: 'link', to: '/messages', label: '메시지', renderIcon: (active) => <NavMessagesIcon active={active} /> },
  { kind: 'search', label: '검색', renderIcon: (active) => <NavSearchIcon active={active} /> },
  { kind: 'notifications', label: '알림', renderIcon: (active) => <NavNotificationsIcon active={active} /> },
  { kind: 'create', label: '만들기', renderIcon: () => <NavCreateIcon /> },
];

function navButtonClass(active: boolean) {
  return cn(
    'flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left',
    active
      ? 'bg-ig-hover text-ig-primary font-semibold'
      : 'text-ig-text hover:bg-ig-hover/80',
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const {
    setCreatePostOpen,
    setNotificationsPanelOpen,
    setSearchPanelOpen,
    isNotificationsPanelOpen,
    isSearchPanelOpen,
  } = useApp();
  const { requireAuth } = useRequireAuth();
  const { messageCount, notificationCount } = useUnreadBadges();

  const handleCreate = () => requireAuth(() => setCreatePostOpen(true));

  const handleSearch = () => {
    setNotificationsPanelOpen(false);
    setSearchPanelOpen(true);
    if (location.pathname !== '/explore' && location.pathname !== '/search') {
      navigate('/explore');
    }
  };

  const handleNotifications = () => {
    requireAuth(() => {
      setSearchPanelOpen(false);
      if (window.matchMedia('(min-width: 768px)').matches) {
        setNotificationsPanelOpen(true);
      } else {
        navigate('/notifications');
      }
    });
  };

  const visibleNavItems = navItems.filter(
    (item) => item.kind !== 'create' || user?.is_admin,
  );

  const isSearchActive =
    isSearchPanelOpen || location.pathname === '/search' || location.pathname === '/explore';
  const isNotificationsActive =
    isNotificationsPanelOpen || location.pathname.startsWith('/notifications');

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-[245px] border-r border-ig-border/80 glass-surface flex-col px-3 py-8 z-40">
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

          if (item.kind === 'search') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={handleSearch}
                className={navButtonClass(isSearchActive)}
                aria-label={item.label}
              >
                {item.renderIcon(isSearchActive)}
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
              onClick={() => {
                setNotificationsPanelOpen(false);
                setSearchPanelOpen(false);
              }}
              className={({ isActive }) => navButtonClass(isActive)}
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    {item.renderIcon(isActive)}
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
              onClick={() => {
                setNotificationsPanelOpen(false);
                setSearchPanelOpen(false);
              }}
              className={({ isActive }) => cn(navButtonClass(isActive), 'mt-2')}
            >
              <ShoppingCart size={24} />
              <span className="text-base hidden lg:inline">장바구니</span>
            </NavLink>
            <NavLink
              to="/orders"
              onClick={() => {
                setNotificationsPanelOpen(false);
                setSearchPanelOpen(false);
              }}
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
            onClick={() => {
              setNotificationsPanelOpen(false);
              setSearchPanelOpen(false);
            }}
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
        onClick={() => {
          setNotificationsPanelOpen(false);
          setSearchPanelOpen(false);
        }}
        className={navButtonClass(false)}
      >
        <NavMenuIcon />
        <span className="text-base hidden lg:inline">더 보기</span>
      </Link>
    </aside>
  );
}
