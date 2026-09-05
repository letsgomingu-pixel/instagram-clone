import { cn } from '@/utils/cn';

const FOOTER_LINKS = [
  '회사 소개',
  '도매 안내',
  '소매 안내',
  '이용약관',
  '개인정보처리방침',
  '고객센터',
  '입고 안내',
  '현장영상',
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
