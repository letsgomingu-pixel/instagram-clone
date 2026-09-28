import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@/types';

export interface ProfileMenuActions {
  onBlock?: () => void;
  onUnblock?: () => void;
  onReport?: (reason: string, details?: string) => Promise<void>;
  blockedByMe?: boolean;
}

interface ProfileMenuContextValue {
  profileUser: User | null;
  actions: ProfileMenuActions | null;
  setProfileMenu: (user: User | null, actions: ProfileMenuActions | null) => void;
}

const ProfileMenuContext = createContext<ProfileMenuContextValue | null>(null);

export function ProfileMenuProvider({ children }: { children: ReactNode }) {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [actions, setActions] = useState<ProfileMenuActions | null>(null);

  // Stable identity: ProfilePage's effect lists this in its deps. Recreating it
  // whenever the menu updates retriggers that effect and blocks route transitions.
  const setProfileMenu = useCallback((user: User | null, next: ProfileMenuActions | null) => {
    setProfileUser(user);
    setActions(next);
  }, []);

  const value = useMemo(
    () => ({ profileUser, actions, setProfileMenu }),
    [profileUser, actions, setProfileMenu],
  );

  return <ProfileMenuContext.Provider value={value}>{children}</ProfileMenuContext.Provider>;
}

export function useProfileMenu() {
  const ctx = useContext(ProfileMenuContext);
  if (!ctx) throw new Error('useProfileMenu must be used within ProfileMenuProvider');
  return ctx;
}
