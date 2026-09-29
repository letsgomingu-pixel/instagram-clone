import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

const navItems = [
  { to: '/admin', label: '대시보드', end: true },
  { to: '/admin/products', label: '상품 관리', end: false },
  { to: '/admin/orders', label: '주문 관리', end: false },
  { to: '/admin/users', label: '회원 관리', end: false },
  { to: '/admin/posts', label: '게시물 관리', end: false },
  { to: '/admin/reports', label: '신고 관리', end: false },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] md:flex">
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 bg-[#1a1d21] text-white px-4 h-14">
        <button type="button" onClick={() => setMenuOpen(true)} className="p-1 -ml-1" aria-label="메뉴">
          <Menu size={22} />
        </button>
        <p className="text-sm font-semibold">관리자 콘솔</p>
        <Link to="/" className="text-xs text-sky-300">
          메인
        </Link>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          aria-label="메뉴 닫기"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-[#1a1d21] text-white transition-transform md:static md:z-auto md:shrink-0 md:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-6 py-6 border-b border-white/10 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold leading-snug">i am not a fishmonger Admin</p>
            <p className="text-xs text-white/60 mt-1">관리자 콘솔</p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="md:hidden p-1 -mr-1 text-white/80"
            aria-label="메뉴 닫기"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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

      <main className="flex-1 min-w-0 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
