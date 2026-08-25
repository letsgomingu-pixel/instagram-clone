import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function useRequireAuth() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const requireAuth = useCallback(
    (action?: () => void): boolean => {
      if (isAuthenticated) {
        action?.();
        return true;
      }
      navigate('/login', { state: { from: location.pathname } });
      return false;
    },
    [isAuthenticated, navigate, location.pathname],
  );

  return { requireAuth, isAuthenticated };
}
