import { cn } from '@/utils/cn';

interface NavBadgeProps {
  count?: number;
  className?: string;
}

export function NavBadge({ count = 0, className }: NavBadgeProps) {
  if (count <= 0) return null;

  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      className={cn(
        'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-ig-red text-white text-[11px] font-bold leading-[18px] text-center',
        className,
      )}
      aria-label={`${label}개의 새 알림`}
    >
      {label}
    </span>
  );
}
