import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

const FOOTER_LINKS: { label: string; to: string }[] = [
  { label: '소개', to: '/info/about' },
  { label: '도움말', to: '/info/help' },
  { label: '개인정보처리방침', to: '/info/privacy' },
  { label: '약관', to: '/info/terms' },
];

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn('text-xs text-ig-text-secondary leading-5 text-center', className)}>
      <p className="flex flex-wrap justify-center gap-x-1 gap-y-0.5">
        {FOOTER_LINKS.map((item, i) => (
          <span key={item.to}>
            {i > 0 && ' · '}
            <Link to={item.to} className="hover:underline">
              {item.label}
            </Link>
          </span>
        ))}
      </p>
      <p className="mt-4">© 2026 i am not a fishmonger</p>
    </footer>
  );
}
