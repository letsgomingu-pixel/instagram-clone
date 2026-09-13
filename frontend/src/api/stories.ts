import type { Story, StoryViewerEntry } from '@/types';
import { api } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function getStoriesFeed(): Promise<Story[]> {
  const { data } = await api.get<Story[]>('/stories/feed');
  return data;
}

export async function createStory(form: FormData): Promise<Story> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/stories`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error('Story upload failed'), {
      response: { status: response.status, data: payload },
    });
  }
  return payload as Story;
}

export async function markStoryViewed(storyId: number): Promise<void> {
  await api.post(`/stories/${storyId}/view`);
}

export async function getStoryViewers(storyId: number): Promise<StoryViewerEntry[]> {
  const { data } = await api.get<StoryViewerEntry[]>(`/stories/${storyId}/viewers`);
  return data;
}

export async function likeStoryItem(
  storyItemId: number,
): Promise<{ is_liked: boolean; like_count: number }> {
  const { data } = await api.post<{ is_liked: boolean; like_count: number }>(
    `/stories/items/${storyItemId}/like`,
  );
  return data;
}

export async function replyToStory(storyItemId: number, content: string): Promise<void> {
  await api.post(`/stories/items/${storyItemId}/reply`, { content });
}

export async function deleteStory(storyId: number): Promise<void> {
  await api.delete(`/stories/${storyId}`);
}
