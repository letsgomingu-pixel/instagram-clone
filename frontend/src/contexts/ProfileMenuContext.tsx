import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
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

  const value = useMemo(
    () => ({
      profileUser,
      actions,
      setProfileMenu: (user: User | null, next: ProfileMenuActions | null) => {
        setProfileUser(user);
        setActions(next);
      },
    }),
    [profileUser, actions],
  );

  return <ProfileMenuContext.Provider value={value}>{children}</ProfileMenuContext.Provider>;
}

export function useProfileMenu() {
  const ctx = useContext(ProfileMenuContext);
  if (!ctx) throw new Error('useProfileMenu must be used within ProfileMenuProvider');
  return ctx;
}
