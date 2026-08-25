import type { Story } from '@/types';
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
