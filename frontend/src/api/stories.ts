import type { Story, StoryViewerEntry } from '@/types';
import { api } from './client';

export async function getStoriesFeed(): Promise<Story[]> {
  const { data } = await api.get<Story[]>('/stories/feed');
  return data;
}

export async function createStory(form: FormData): Promise<Story> {
  const { data } = await api.post<Story>('/stories', form);
  return data;
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
