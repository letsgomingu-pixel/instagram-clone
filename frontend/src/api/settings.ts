import { api } from './client';

export interface UserSettings {
  notify_likes: boolean;
  notify_comments: boolean;
  notify_follows: boolean;
  notify_mentions: boolean;
  is_private: boolean;
  show_activity_status: boolean;
  allow_story_replies: boolean;
  comments_privacy: 'everyone' | 'followers' | 'off';
  mentions_privacy: 'everyone' | 'followers' | 'off';
}

export type UserSettingsUpdate = Partial<UserSettings>;

export async function getMySettings(): Promise<UserSettings> {
  const { data } = await api.get<UserSettings>('/users/me/settings');
  return data;
}

export async function updateMySettings(body: UserSettingsUpdate): Promise<UserSettings> {
  const { data } = await api.put<UserSettings>('/users/me/settings', body);
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put('/users/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
