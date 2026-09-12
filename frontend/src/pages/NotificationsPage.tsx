import { Navigate, useLocation } from 'react-router-dom';
import { NotificationsContent } from '@/components/notifications/NotificationsContent';
import { useAuth } from '@/hooks/useAuth';

export function NotificationsPage() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <NotificationsContent variant="page" />;
}
