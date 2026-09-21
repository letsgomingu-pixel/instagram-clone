import type { BeforeInstallPromptEvent } from './detect';

const listeners = new Set<(event: BeforeInstallPromptEvent | null) => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;

function emit(event: BeforeInstallPromptEvent | null) {
  listeners.forEach((listener) => listener(event));
}

export function subscribeInstallPrompt(listener: (event: BeforeInstallPromptEvent | null) => void) {
  listeners.add(listener);
  if (deferredPrompt) listener(deferredPrompt);
  return () => {
    listeners.delete(listener);
  };
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
  emit(null);
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit(deferredPrompt);
  });

  window.addEventListener('appinstalled', () => {
    clearDeferredPrompt();
  });

  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
    // Registration can fail on HTTP (except localhost) or unsupported browsers.
  });
}
