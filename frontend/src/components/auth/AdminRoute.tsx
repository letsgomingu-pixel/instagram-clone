import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/common/Spinner';
import { useAuth } from '@/hooks/useAuth';

export function AdminRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1d21]">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated || !user?.is_admin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

export function AdminGuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1d21]">
        <Spinner />
      </div>
    );
  }

  if (isAuthenticated && user?.is_admin) {
    const from = (location.state as { from?: string })?.from || '/admin';
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}
