import { Outlet, useLocation } from 'react-router-dom';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

export function SettingsLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isSettingsRoot = location.pathname === '/settings';
  const isSettingsDetail = location.pathname.startsWith('/settings/');

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <div className="md:-mt-8">
      <div className="bg-white border border-ig-border md:rounded-lg overflow-hidden min-h-[calc(100dvh-44px)] md:min-h-[600px]">
        <div className="hidden md:block px-8 py-6 border-b border-ig-border">
          <h1 className="text-[24px] font-normal">설정</h1>
        </div>
        <div className="flex flex-col md:flex-row min-h-0 flex-1">
          <SettingsNav
            className={cn(isSettingsDetail && 'hidden md:block')}
          />
          <div
            className={cn(
              'flex-1 px-4 md:px-12 py-6 md:py-10 min-w-0',
              isSettingsRoot && 'hidden md:block',
            )}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
