import type { PaginatedResponse, Reel } from '@/types';
import { api } from './client';

export async function getReelsFeed(page = 1, limit = 20): Promise<PaginatedResponse<Reel>> {
  const { data } = await api.get<PaginatedResponse<Reel>>('/reels/feed', { params: { page, limit } });
  return data;
}

export async function toggleReelLike(reelId: number): Promise<{ is_liked: boolean; like_count: number }> {
  const { data } = await api.post<{ is_liked: boolean; like_count: number }>(`/reels/${reelId}/like`);
  return data;
}

export async function viewReel(reelId: number): Promise<void> {
  await api.post(`/reels/${reelId}/view`);
}

export async function createReel(form: FormData): Promise<Reel> {
  const { data } = await api.post<Reel>('/reels', form);
  return data;
}
