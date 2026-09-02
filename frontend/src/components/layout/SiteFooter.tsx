import { cn } from '@/utils/cn';

const FOOTER_LINKS = [
  '소개',
  '도움말',
  '홍보 센터',
  '개발자 센터',
  '채용 정보',
  '개인정보처리방침',
  '약관',
  '위치',
  '언어',
] as const;

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn('text-xs text-ig-text-secondary leading-5 text-center', className)}>
      <p className="flex flex-wrap justify-center gap-x-1 gap-y-0.5">
        {FOOTER_LINKS.map((item, i) => (
          <span key={item}>
            {i > 0 && ' · '}
            <a href="#" className="hover:underline">
              {item}
            </a>
          </span>
        ))}
      </p>
      <p className="mt-4">© 2026 i am not a fishmonger</p>
    </footer>
  );
}
