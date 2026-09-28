import type { Notification, NotificationTab } from '@/types';
import { api } from './client';

export async function getNotifications(tab: NotificationTab = 'you'): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>('/notifications', { params: { tab } });
  return data;
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const { data } = await api.patch<Notification>(`/notifications/${id}/read`, { is_read: true });
  return data;
}

export async function getPushPublicKey(): Promise<string> {
  const { data } = await api.get<{ public_key: string }>('/notifications/push-key');
  return data.public_key;
}

export async function savePushSubscription(payload: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  await api.post('/notifications/push-subscription', payload);
}
