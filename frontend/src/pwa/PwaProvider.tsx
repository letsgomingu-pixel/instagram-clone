import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  dismissInstallPrompt,
  isAndroidDevice,
  isInAppBrowser,
  isInstallDismissed,
  isIosDevice,
  isMobileDevice,
  isStandaloneDisplay,
  markStandaloneClass,
  type BeforeInstallPromptEvent,
} from './detect';
import { clearDeferredPrompt, subscribeInstallPrompt } from './register';

interface PwaContextValue {
  isStandalone: boolean;
  isIos: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isInApp: boolean;
  canInstall: boolean;
  showInstallHint: boolean;
  install: () => Promise<boolean>;
  dismissHint: () => void;
}

const PwaContext = createContext<PwaContextValue>({
  isStandalone: false,
  isIos: false,
  isAndroid: false,
  isMobile: false,
  isInApp: false,
  canInstall: false,
  showInstallHint: false,
  install: async () => false,
  dismissHint: () => undefined,
});

export function PwaProvider({ children }: { children: ReactNode }) {
  const [isStandalone, setStandalone] = useState(() => isStandaloneDisplay());
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => isInstallDismissed());
  const [isMobile, setMobile] = useState(() => isMobileDevice());
  const isIos = isIosDevice();
  const isAndroid = isAndroidDevice();
  const isInApp = isInAppBrowser();

  useEffect(() => {
    markStandaloneClass();
    setStandalone(isStandaloneDisplay());
    setMobile(isMobileDevice());
    const media = window.matchMedia('(display-mode: standalone)');
    const viewport = window.matchMedia('(max-width: 767px)');
    const onChange = () => {
      setStandalone(isStandaloneDisplay());
      setMobile(isMobileDevice());
      markStandaloneClass();
    };
    media.addEventListener('change', onChange);
    viewport.addEventListener('change', onChange);
    const unsubscribe = subscribeInstallPrompt(setDeferred);
    return () => {
      media.removeEventListener('change', onChange);
      viewport.removeEventListener('change', onChange);
      unsubscribe();
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    clearDeferredPrompt();
    setDeferred(null);
    return choice.outcome === 'accepted';
  }, [deferred]);

  const dismissHint = useCallback(() => {
    dismissInstallPrompt();
    setDismissed(true);
  }, []);

  const canInstall = Boolean(deferred) && !isStandalone;
  const showInstallHint = !isStandalone && !dismissed;

  const value = useMemo(
    () => ({
      isStandalone,
      isIos,
      isAndroid,
      isMobile,
      isInApp,
      canInstall,
      showInstallHint,
      install,
      dismissHint,
    }),
    [
      isStandalone,
      isIos,
      isAndroid,
      isMobile,
      isInApp,
      canInstall,
      showInstallHint,
      install,
      dismissHint,
    ],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  return useContext(PwaContext);
}
