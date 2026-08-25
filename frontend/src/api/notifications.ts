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
