import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link2, ShieldBan, ShieldOff, Flag } from 'lucide-react';

const REPORT_REASONS = [
  { value: 'spam', label: '스팸' },
  { value: 'inappropriate', label: '부적절한 콘텐츠' },
  { value: 'harassment', label: '괴롭힘' },
  { value: 'other', label: '기타' },
] as const;

interface ProfileOptionsMenuProps {
  username: string;
  blockedByMe?: boolean;
  onBlock?: () => void;
  onUnblock?: () => void;
  onReport?: (reason: string, details?: string) => Promise<void>;
  onClose: () => void;
}

export function ProfileOptionsMenu({
  username,
  blockedByMe,
  onBlock,
  onUnblock,
  onReport,
  onClose,
}: ProfileOptionsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const copyProfileLink = async () => {
    const url = `${window.location.origin}/profile/${username}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('프로필 링크가 복사되었습니다.');
    } catch {
      toast.error('링크 복사에 실패했습니다.');
    }
    onClose();
  };

  const submitReport = async () => {
    if (!onReport) return;
    try {
      await onReport(reason);
      toast.success('신고가 접수되었습니다.');
      onClose();
    } catch {
      toast.error('신고에 실패했습니다.');
    }
  };

  if (showReport) {
    return (
      <div
        ref={ref}
        className="absolute right-0 top-full mt-1 min-w-[220px] rounded-xl border border-ig-border bg-ig-surface py-2 shadow-lg z-50"
      >
        <p className="px-4 py-2 text-sm font-semibold border-b border-ig-border">계정 신고</p>
        {REPORT_REASONS.map((r) => (
          <label key={r.value} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ig-secondary cursor-pointer">
            <input type="radio" name="report-reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
            {r.label}
          </label>
        ))}
        <div className="flex gap-2 px-4 pt-2">
          <button type="button" onClick={() => setShowReport(false)} className="flex-1 text-sm py-1.5 rounded-lg bg-ig-secondary">
            취소
          </button>
          <button type="button" onClick={() => void submitReport()} className="flex-1 text-sm py-1.5 rounded-lg bg-red-500 text-white">
            신고
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 min-w-[180px] rounded-xl border border-ig-border bg-ig-surface py-2 shadow-lg z-50"
    >
      <button type="button" onClick={() => void copyProfileLink()} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-ig-secondary">
        <Link2 size={16} />
        프로필 링크 복사
      </button>
      {onReport && (
        <button type="button" onClick={() => setShowReport(true)} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-ig-secondary">
          <Flag size={16} />
          신고
        </button>
      )}
      {blockedByMe && onUnblock ? (
        <button type="button" onClick={() => { onUnblock(); onClose(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-ig-secondary">
          <ShieldOff size={16} />
          차단 해제
        </button>
      ) : onBlock ? (
        <button type="button" onClick={() => { onBlock(); onClose(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-ig-secondary">
          <ShieldBan size={16} />
          차단
        </button>
      ) : null}
    </div>
  );
}
