import { getPushPublicKey, savePushSubscription } from '@/api/notifications';

export type OrderPushResult = 'enabled' | 'denied' | 'unsupported' | 'install';

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function orderPushSupport(): OrderPushResult | 'prompt' | 'granted' {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return 'prompt';
}

export async function enableOrderPush(): Promise<OrderPushResult> {
  const support = orderPushSupport();
  if (support === 'unsupported' || support === 'denied') return support;

  const permission = support === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const publicKey = await getPushPublicKey();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const json = subscription.toJSON();
    if (!json.keys?.p256dh || !json.keys.auth) return 'unsupported';
    await savePushSubscription({
      endpoint: subscription.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
    return 'enabled';
  } catch {
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    return ios ? 'install' : 'unsupported';
  }
}
