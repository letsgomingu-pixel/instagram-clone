import toast from 'react-hot-toast';

function canUseNativeShare(): boolean {
  if (typeof navigator.share !== 'function') return false;
  // Desktop browsers expose navigator.share but show a broken empty picker on Windows.
  return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches;
}

export async function shareUrl(url: string, title: string): Promise<void> {
  try {
    if (canUseNativeShare()) {
      await navigator.share({ url, title });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success('링크가 클립보드에 복사되었습니다.');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('링크가 클립보드에 복사되었습니다.');
    } catch {
      toast.error('공유에 실패했습니다.');
    }
  }
}

export function postShareUrl(postId: number): string {
  return `${window.location.origin}/p/${postId}`;
}

export function reelShareUrl(reelId: number): string {
  return `${window.location.origin}/reels/${reelId}`;
}
