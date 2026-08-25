import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

const settingsNavItems = [
  { to: '/settings/edit', label: '프로필 편집' },
  { to: '/settings/notifications', label: '알림' },
  { to: '/settings/privacy', label: '개인정보 보호' },
  { to: '/settings/security', label: '보안' },
  { to: '/settings/account', label: '계정 정보' },
] as const;

interface SettingsNavProps {
  className?: string;
}

export function SettingsNav({ className }: SettingsNavProps) {
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
                    ? 'border-ig-text font-semibold text-ig-text bg-[#fafafa]'
                    : 'border-transparent text-ig-text hover:bg-[#fafafa]',
                )
              }
            >
              <span>{label}</span>
              <ChevronRight size={16} className="md:hidden text-ig-text-secondary" />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
