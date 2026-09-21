import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { pwaInstallDescription } from './copy';
import { usePwa } from './PwaProvider';
import { cn } from '@/utils/cn';

export function PwaInstallBanner({ inline = false }: { inline?: boolean }) {
  const { showInstallHint, canInstall, isIos, isInApp, install, dismissHint } = usePwa();
  const { pathname } = useLocation();

  if (typeof document === 'undefined') return null;
  if (!showInstallHint || pathname.startsWith('/admin')) return null;

  const handleInstall = async () => {
    if (!canInstall) return;
    const accepted = await install();
    if (accepted) dismissHint();
  };

  const node = (
    <div
      role="dialog"
      aria-label="앱 설치"
      className={cn('pwa-install-banner', inline && 'pwa-install-banner--inline')}
    >
      <img src="/icon-192.png" alt="" width={44} height={44} />
      <div className="pwa-install-banner__body">
        <p className="pwa-install-banner__title">앱처럼 사용하기</p>
        <p className="pwa-install-banner__copy">
          {pwaInstallDescription({ canInstall, isIos, isInApp })}
        </p>
        {canInstall && (
          <Button size="sm" className="mt-2" onClick={() => void handleInstall()}>
            <Download size={14} className="mr-1" />
            설치
          </Button>
        )}
      </div>
      <button
        type="button"
        onClick={dismissHint}
        aria-label="닫기"
        className="pwa-install-banner__close"
      >
        <X size={16} />
      </button>
    </div>
  );

  if (inline) return node;
  return createPortal(node, document.body);
}
