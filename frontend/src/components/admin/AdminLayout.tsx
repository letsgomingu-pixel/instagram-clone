import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

const navItems = [
  { to: '/admin', label: '대시보드', end: true },
  { to: '/admin/users', label: '회원 관리', end: false },
  { to: '/admin/posts', label: '게시물 관리', end: false },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex">
      <aside className="w-[240px] shrink-0 bg-[#1a1d21] text-white flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <p className="text-sm font-semibold leading-snug">i am not a fishmonger Admin</p>
          <p className="text-xs text-white/60 mt-1">관리자 콘솔</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'block rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-white/15 font-semibold' : 'text-white/80 hover:bg-white/10',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 space-y-2">
          <p className="text-xs text-white/50 truncate">@{user?.username}</p>
          <Link to="/" className="block text-xs text-sky-300 hover:underline">
            메인 사이트로
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-white/70 hover:text-white"
          >
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
