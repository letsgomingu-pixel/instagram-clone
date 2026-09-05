import { NavLink, Link } from 'react-router-dom';

import { Avatar } from '@/components/common/Avatar';

import {

  NavCreateIcon,

  NavExploreIcon,

  NavHomeIcon,

  NavLoginIcon,

  NavMenuIcon,

  NavMessagesIcon,

  NavNotificationsIcon,

  NavSearchIcon,

} from '@/components/post/PostActionIcons';

import { ReelsIcon } from '@/components/common/ReelsIcon';

import { useAuth } from '@/hooks/useAuth';

import { useApp } from '@/contexts/AppContext';

import { useRequireAuth } from '@/hooks/useRequireAuth';

import { cn } from '@/utils/cn';

import { InstagramLogo } from '@/components/common/InstagramLogo';



const navItems = [

  { to: '/', label: '현장피드', renderIcon: (active: boolean) => <NavHomeIcon active={active} /> },

  { to: '/search', label: '검색', renderIcon: (active: boolean) => <NavSearchIcon active={active} /> },

  { to: '/explore', label: '카탈로그', renderIcon: (active: boolean) => <NavExploreIcon active={active} /> },

  { to: '/reels', label: '현장영상', isReels: true },

  { to: '/messages', label: '거래문의', renderIcon: (active: boolean) => <NavMessagesIcon active={active} /> },

  { to: '#create', label: '등록', action: 'create' as const, renderIcon: () => <NavCreateIcon /> },

  { to: '/notifications', label: '알림', renderIcon: (active: boolean) => <NavNotificationsIcon active={active} /> },

];



export function Sidebar() {

  const { user, isAuthenticated } = useAuth();

  const { setCreatePostOpen } = useApp();

  const { requireAuth } = useRequireAuth();



  const handleCreate = () => requireAuth(() => setCreatePostOpen(true));



  return (

    <aside className="hidden md:flex fixed left-0 top-0 h-full w-[245px] border-r border-ig-border bg-white/95 backdrop-blur-sm flex-col px-3 py-8 z-40">

      <NavLink to="/" className="px-3 mb-6">

        <InstagramLogo className="text-[16px] leading-tight text-center hidden lg:block" />

        <div className="lg:hidden flex justify-center">

          <InstagramLogo className="text-[16px] leading-tight text-center" />

        </div>

      </NavLink>



      <nav className="flex flex-col gap-1 flex-1">

        {navItems.map(({ to, label, action, isReels, renderIcon }) =>

          action === 'create' ? (

            <button

              key={label}

              onClick={handleCreate}

              className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-ig-secondary transition-colors w-full text-left"

              aria-label={label}

            >

              {renderIcon?.()}

              <span className="text-base hidden lg:inline">{label}</span>

            </button>

          ) : (

            <NavLink

              key={to}

              to={to}

              className={({ isActive }) =>

                cn(

                  'flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-ig-secondary transition-colors',

                  isActive && 'font-bold',

                )

              }

            >

              {({ isActive }) => (

                <>

                  {isReels ? (

                    <ReelsIcon size={24} filled={isActive} />

                  ) : (

                    renderIcon?.(isActive)

                  )}

                  <span className="text-base hidden lg:inline">{label}</span>

                </>

              )}

            </NavLink>

          ),

        )}



        {isAuthenticated ? (

          <NavLink

            to={`/profile/${user?.username}`}

            className={({ isActive }) =>

              cn(

                'flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-ig-secondary transition-colors mt-auto',

                isActive && 'font-bold',

              )

            }

          >

            <Avatar src={user?.avatar_url} alt="거래처" size="sm" />

            <span className="text-base hidden lg:inline truncate">거래처</span>

          </NavLink>

        ) : (

          <Link

            to="/login"

            className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-ig-secondary transition-colors mt-auto text-ig-primary"

          >

            <NavLoginIcon />

            <span className="text-base hidden lg:inline font-semibold">로그인</span>

          </Link>

        )}

      </nav>

      <Link
        to="/settings"
        className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-ig-secondary transition-colors mt-2"
      >
        <NavMenuIcon />
        <span className="text-base hidden lg:inline">더 보기</span>
      </Link>
    </aside>

  );

}


