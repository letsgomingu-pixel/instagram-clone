import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  onDelete?: () => void | Promise<void>;
  onReport?: (reason: string) => Promise<void>;
  onClose: () => void;
}

export function ReelOptionsMenu({ reelId, isOwnReel, onDelete, onReport, onClose }: ReelOptionsMenuProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ right: number; bottom: number } | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [deleting, setDeleting] = useState(false);

  useLayoutEffect(() => {
    const update = () => {
      const rect = anchorRef.current?.parentElement?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        right: window.innerWidth - rect.right,
        bottom: window.innerHeight - rect.top + 8,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, []);

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const copyLink = async (e: React.MouseEvent) => {
    stop(e);
    const url = `${window.location.origin}/reels/${reelId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('링크가 복사되었습니다.');
    } catch {
      toast.error('링크 복사에 실패했습니다.');
    }
    onClose();
  };

  const submitReport = async (e: React.MouseEvent) => {
    stop(e);
    if (!onReport) return;
    try {
      await onReport(reason);
      toast.success('신고가 접수되었습니다.');
      onClose();
    } catch {
      toast.error('신고에 실패했습니다.');
    }
  };

  const runDelete = async (e: React.MouseEvent) => {
    stop(e);
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const menu = (
    <div
      className="fixed z-[210] min-w-[200px] rounded-xl border border-white/20 bg-black/90 py-2 text-white shadow-lg"
      style={coords ? { right: coords.right, bottom: coords.bottom } : { visibility: 'hidden', right: 0, bottom: 0 }}
      onClick={stop}
      onMouseDown={stop}
      onPointerDown={stop}
    >
      {confirmDelete ? (
        <>
          <p className="px-4 py-2 text-sm font-semibold">이 릴스를 삭제할까요?</p>
          <div className="flex gap-2 px-4 py-2">
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                setConfirmDelete(false);
              }}
              className="flex-1 rounded-lg bg-white/10 py-1.5 text-sm"
            >
              취소
            </button>
            <button
              type="button"
              onClick={(e) => void runDelete(e)}
              disabled={deleting}
              className="flex-1 rounded-lg bg-red-500 py-1.5 text-sm disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </>
      ) : showReport ? (
        <>
          <p className="border-b border-white/20 px-4 py-2 text-sm font-semibold">릴스 신고</p>
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm hover:bg-white/10">
              <input type="radio" name="reel-report" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
              {r.label}
            </label>
          ))}
          <div className="flex gap-2 px-4 pt-2">
            <button type="button" onClick={() => setShowReport(false)} className="flex-1 rounded-lg bg-white/10 py-1.5 text-sm">
              취소
            </button>
            <button type="button" onClick={(e) => void submitReport(e)} className="flex-1 rounded-lg bg-red-500 py-1.5 text-sm">
              신고
            </button>
          </div>
        </>
      ) : (
        <>
          <button type="button" onClick={(e) => void copyLink(e)} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-white/10">
            <Link2 size={16} /> 링크 복사
          </button>
          {!isOwnReel && onReport && (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                setShowReport(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-white/10"
            >
              <Flag size={16} /> 신고
            </button>
          )}
          {isOwnReel && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                setConfirmDelete(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-white/10"
            >
              <Trash2 size={16} /> 릴스 삭제하기
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <span ref={anchorRef} className="pointer-events-none absolute right-0 bottom-0 h-0 w-0" aria-hidden />
      {createPortal(
        <>
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="fixed inset-0 z-[200] cursor-default bg-transparent"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
          {menu}
        </>,
        document.body,
      )}
    </>
  );
}
