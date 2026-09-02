import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Menu, MoreHorizontal } from 'lucide-react';
import { InstagramLogo } from '@/components/common/InstagramLogo';
import { NavBadge } from '@/components/common/NavBadge';
import { MobileHeaderIconStrip } from '@/components/layout/MobileHeaderIconStrip';
import {
  NavIcon,
  NavMessagesIcon,
  NavNotificationsIcon,
} from '@/components/post/PostActionIcons';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadBadges } from '@/hooks/useUnreadBadges';
import type { MobileChromeConfig } from '@/hooks/useMobileChrome';

interface MobileHeaderProps {
  config: MobileChromeConfig;
}

export function MobileHeader({ config }: MobileHeaderProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { messageCount, notificationCount } = useUnreadBadges();

  if (!config.showHeader || config.headerVariant === 'none') return null;

  const handleBack = () => {
    if (config.backTo) navigate(config.backTo);
    else navigate(-1);
  };

  const isOwnProfile =
    config.headerVariant === 'profile' &&
    isAuthenticated &&
    user?.username === config.title;

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white border-b border-ig-border mobile-header-safe shrink-0">
      <div className="flex items-center justify-between px-4 h-[44px]">
        {config.headerVariant === 'home' && (
          <>
            <Link to="/" aria-label="홈" className="min-w-0">
              <InstagramLogo className="text-[13px] leading-none truncate block max-w-[190px]" />
            </Link>
            <div className="flex items-center gap-[18px]">
              <Link to="/notifications" className="relative p-0.5" aria-label="알림">
                <NavNotificationsIcon />
                <NavBadge count={notificationCount} />
              </Link>
              <Link to="/messages" className="relative p-0.5" aria-label="메시지">
                <NavMessagesIcon />
                <NavBadge count={messageCount} />
              </Link>
            </div>
          </>
        )}

        {config.headerVariant === 'title-only' && (
          <>
            <div className="w-6" aria-hidden />
            <h1 className="text-[16px] font-semibold truncate">{config.title}</h1>
            <div className="w-6" aria-hidden />
          </>
        )}

        {config.headerVariant === 'back-title' && (
          <>
            <button type="button" onClick={handleBack} className="p-1 -ml-1" aria-label="뒤로">
              <NavIcon icon={ChevronLeft} />
            </button>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold truncate max-w-[50%]">
              {config.title}
            </h1>
            <div className="flex items-center gap-[14px]">
              <Link to="/notifications" className="relative p-0.5" aria-label="알림">
                <NavNotificationsIcon />
                <NavBadge count={notificationCount} />
              </Link>
              <Link to="/messages" className="relative p-0.5" aria-label="메시지">
                <NavMessagesIcon />
                <NavBadge count={messageCount} />
              </Link>
            </div>
          </>
        )}

        {config.headerVariant === 'profile' && (
          <>
            {!isOwnProfile ? (
              <button type="button" onClick={handleBack} className="p-1 -ml-1" aria-label="뒤로">
                <NavIcon icon={ChevronLeft} />
              </button>
            ) : (
              <Link to="/settings" className="p-1 -ml-1" aria-label="설정">
                <NavIcon icon={Menu} />
              </Link>
            )}
            <h1 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold truncate max-w-[45%]">
              {config.title}
            </h1>
            <button type="button" className="p-1 -mr-1" aria-label="옵션">
              <NavIcon icon={MoreHorizontal} />
            </button>
          </>
        )}
      </div>

      {config.showHeaderNav && <MobileHeaderIconStrip />}
    </header>
  );
}

/** @deprecated Use MobileHeader from MainLayout */
export function Header() {
  return null;
}
