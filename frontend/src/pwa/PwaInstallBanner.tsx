import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { pwaInstallDescription } from './copy';
import { usePwa } from './PwaProvider';

export function PwaInstallBanner() {
  const { showInstallHint, canInstall, isIos, isInApp, install, dismissHint } = usePwa();
  const { pathname } = useLocation();

  if (typeof document === 'undefined') return null;
  if (!showInstallHint || pathname.startsWith('/admin')) return null;

  const hasMobileHeader =
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/signup') &&
    !pathname.startsWith('/find-account') &&
    !pathname.startsWith('/reset-password') &&
    !pathname.startsWith('/forgot-password');

  const handleInstall = async () => {
    if (!canInstall) return;
    const accepted = await install();
    if (accepted) dismissHint();
  };

  return createPortal(
    <div
      role="dialog"
      aria-label="앱 설치"
      className="pwa-install-banner"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        top: hasMobileHeader
          ? 'calc(52px + env(safe-area-inset-top, 0px))'
          : 'calc(12px + env(safe-area-inset-top, 0px))',
        zIndex: 2147483646,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        border: '1px solid #dbdbdb',
        background: '#ffffff',
        boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
      }}
    >
      <img src="/icon-192.png" alt="" width={44} height={44} style={{ borderRadius: 12, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>앱처럼 사용하기</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.45, color: '#8e8e8e' }}>
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
        style={{
          border: 0,
          background: 'transparent',
          padding: 4,
          color: '#8e8e8e',
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>,
    document.body,
  );
}
