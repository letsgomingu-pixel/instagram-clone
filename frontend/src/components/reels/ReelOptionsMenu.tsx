import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link2, Trash2, Flag } from 'lucide-react';

const REPORT_REASONS = [
  { value: 'spam', label: '스팸' },
  { value: 'inappropriate', label: '부적절한 콘텐츠' },
  { value: 'violence', label: '폭력 또는 위험한 콘텐츠' },
  { value: 'other', label: '기타' },
] as const;

interface ReelOptionsMenuProps {
  reelId: number;
  isOwnReel: boolean;
  onDelete?: () => void;
  onReport?: (reason: string) => Promise<void>;
  onClose: () => void;
}

export function ReelOptionsMenu({ reelId, isOwnReel, onDelete, onReport, onClose }: ReelOptionsMenuProps) {
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

  const copyLink = async () => {
    const url = `${window.location.origin}/reels/${reelId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('링크가 복사되었습니다.');
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
      <div ref={ref} className="absolute right-0 bottom-full mb-2 min-w-[200px] rounded-xl border border-white/20 bg-black/90 py-2 shadow-lg text-white">
        <p className="px-4 py-2 text-sm font-semibold border-b border-white/20">릴스 신고</p>
        {REPORT_REASONS.map((r) => (
          <label key={r.value} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/10 cursor-pointer">
            <input type="radio" name="reel-report" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
            {r.label}
          </label>
        ))}
        <div className="flex gap-2 px-4 pt-2">
          <button type="button" onClick={() => setShowReport(false)} className="flex-1 text-sm py-1.5 rounded-lg bg-white/10">취소</button>
          <button type="button" onClick={() => void submitReport()} className="flex-1 text-sm py-1.5 rounded-lg bg-red-500">신고</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="absolute right-0 bottom-full mb-2 min-w-[160px] rounded-xl border border-white/20 bg-black/90 py-2 shadow-lg text-white">
      <button type="button" onClick={() => void copyLink()} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-white/10">
        <Link2 size={16} /> 링크 복사
      </button>
      {!isOwnReel && onReport && (
        <button type="button" onClick={() => setShowReport(true)} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-white/10">
          <Flag size={16} /> 신고
        </button>
      )}
      {isOwnReel && onDelete && (
        <button type="button" onClick={() => { onDelete(); onClose(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-white/10">
          <Trash2 size={16} /> 삭제
        </button>
      )}
    </div>
  );
}
