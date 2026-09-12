import { NavLink, Link } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { ReelsIcon } from '@/components/common/ReelsIcon';
import {
  NavCreateIcon,
  NavHomeIcon,
  NavLoginIcon,
  NavMessagesIcon,
  NavSearchIcon,
} from '@/components/post/PostActionIcons';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/utils/cn';

export function BottomNav() {
  const { user, isAuthenticated } = useAuth();
  const { setCreatePostOpen } = useApp();
  const { requireAuth } = useRequireAuth();
  const showCreate = Boolean(user?.is_admin);

  const handleCreate = () => requireAuth(() => setCreatePostOpen(true));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 mobile-bottom-nav-safe glass-surface border-t border-ig-border/80 shadow-[0_-4px_24px_rgba(41,171,226,0.08)] flex items-stretch justify-around z-40">
      <NavLink to="/" className="flex flex-1 items-center justify-center min-h-[49px]" aria-label="홈">
        {({ isActive }) => <NavHomeIcon active={isActive} />}
      </NavLink>

      <NavLink
        to="/reels"
        className="flex flex-1 items-center justify-center min-h-[49px]"
        aria-label="릴스"
      >
        {({ isActive }) => <ReelsIcon size={24} filled={isActive} />}
      </NavLink>

      {showCreate ? (
        <button
          type="button"
          onClick={handleCreate}
          className="flex flex-1 items-center justify-center min-h-[49px]"
          aria-label="만들기"
        >
          <NavCreateIcon />
        </button>
      ) : (
        <NavLink
          to="/search"
          className="flex flex-1 items-center justify-center min-h-[49px]"
          aria-label="검색"
        >
          {({ isActive }) => <NavSearchIcon active={isActive} />}
        </NavLink>
      )}

      {isAuthenticated ? (
        <NavLink
          to="/messages"
          className="flex flex-1 items-center justify-center min-h-[49px]"
          aria-label="메시지"
        >
          <NavMessagesIcon />
        </NavLink>
      ) : (
        <NavLink
          to="/search"
          className="flex flex-1 items-center justify-center min-h-[49px]"
          aria-label="검색"
        >
          {({ isActive }) => <NavSearchIcon active={isActive} />}
        </NavLink>
      )}

      {isAuthenticated ? (
        <NavLink
          to={`/profile/${user?.username}`}
          className="flex flex-1 items-center justify-center min-h-[49px]"
          aria-label="프로필"
        >
          {({ isActive }) => (
            <div className={cn(isActive && 'ring-2 ring-ig-primary rounded-full p-[1px]')}>
              <Avatar src={user?.avatar_url} alt="프로필" size="xs" />
            </div>
          )}
        </NavLink>
      ) : (
        <Link
          to="/login"
          className="flex flex-1 items-center justify-center min-h-[49px] text-ig-primary"
          aria-label="로그인"
        >
          <NavLoginIcon />
        </Link>
      )}
    </nav>
  );
}
