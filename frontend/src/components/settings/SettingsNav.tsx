import { NavLink } from 'react-router-dom';
import { ChevronRight, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { usePwa } from '@/pwa';

const settingsNavItems = [
  { to: '/settings/edit', label: '프로필 편집' },
  { to: '/settings/shipping', label: '배송지 관리' },
  { to: '/orders', label: '내 주문' },
  { to: '/settings/notifications', label: '알림' },
  { to: '/settings/privacy', label: '개인정보 보호' },
  { to: '/settings/follow-requests', label: '팔로우 요청' },
  { to: '/settings/blocked', label: '차단한 계정' },
  { to: '/settings/security', label: '보안' },
  { to: '/settings/account', label: '계정 정보' },
] as const;

interface SettingsNavProps {
  className?: string;
}

export function SettingsNav({ className }: SettingsNavProps) {
  const { canInstall, isStandalone, isIos, isAndroid, showInstallHint, install } = usePwa();
  const showInstall = showInstallHint;

  return (
    <nav
      className={cn(
        'w-full md:w-[250px] shrink-0 border-b md:border-b-0 md:border-r border-ig-border',
        className,
      )}
    >
      <ul className="py-2 md:py-2">
        {settingsNavItems.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-4 md:px-6 py-4 md:py-3 text-[16px] border-l-2 md:border-l-2 transition-colors',
                  isActive
                    ? 'border-ig-text font-semibold text-ig-text bg-ig-hover'
                    : 'border-transparent text-ig-text hover:bg-ig-hover',
                )
              }
            >
              <span>{label}</span>
              <ChevronRight size={16} className="md:hidden text-ig-text-secondary" />
            </NavLink>
          </li>
        ))}
        {showInstall && (
          <li>
            <button
              type="button"
              onClick={() => {
                if (canInstall) {
                  void install();
                  return;
                }
                if (isIos) {
                  toast('공유 버튼에서 ‘홈 화면에 추가’를 선택하세요.');
                  return;
                }
                if (isAndroid) {
                  toast('브라우저 메뉴(⋮)에서 ‘홈 화면에 추가’ 또는 ‘앱 설치’를 선택하세요.');
                  return;
                }
                toast('브라우저 메뉴에서 홈 화면에 추가할 수 있습니다.');
              }}
              className="flex w-full items-center justify-between px-4 md:px-6 py-4 md:py-3 text-[16px] border-l-2 border-transparent text-ig-text hover:bg-ig-hover"
            >
              <span className="flex items-center gap-2">
                <Download size={16} />
                앱 설치
              </span>
              <ChevronRight size={16} className="md:hidden text-ig-text-secondary" />
            </button>
          </li>
        )}
        {isStandalone && (
          <li className="px-4 md:px-6 py-4 md:py-3 text-[13px] text-ig-text-secondary">
            홈 화면 앱으로 실행 중입니다.
          </li>
        )}
      </ul>
    </nav>
  );
}
