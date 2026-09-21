import { Download } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { pwaInstallDescription } from './copy';
import { usePwa } from './PwaProvider';

export function PwaInstallCard() {
  const { showInstallHint, canInstall, isIos, isInApp, install, dismissHint } = usePwa();

  if (!showInstallHint) return null;

  const handleInstall = async () => {
    if (!canInstall) return;
    const accepted = await install();
    if (accepted) dismissHint();
  };

  return (
    <div className="feed-card mb-3 px-4 py-3 flex items-start gap-3 md:hidden" data-testid="pwa-install-card">
      <img src="/icon-192.png" alt="" className="h-11 w-11 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">앱처럼 사용하기</p>
        <p className="text-xs text-ig-text-secondary mt-1 leading-5">
          {pwaInstallDescription({ canInstall, isIos, isInApp })}
        </p>
        <div className="mt-2 flex items-center gap-3">
          {canInstall && (
            <Button size="sm" onClick={() => void handleInstall()}>
              <Download size={14} className="mr-1" />
              설치
            </Button>
          )}
          <button
            type="button"
            onClick={dismissHint}
            className="text-xs font-semibold text-ig-text-secondary"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
