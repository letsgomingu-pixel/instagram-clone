import type { PaginatedResponse, Reel, ReelComment } from '@/types';
import { api } from './client';

const SESSION_KEY = 'reel_view_session';

function getSessionKey(): string {
  let key = localStorage.getItem(SESSION_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, key);
  }
  return key;
}

export async function getReelsFeed(page = 1, limit = 20): Promise<PaginatedResponse<Reel>> {
  const { data } = await api.get<PaginatedResponse<Reel>>('/reels/feed', { params: { page, limit } });
  return data;
}

export async function toggleReelLike(reelId: number): Promise<{ is_liked: boolean; like_count: number }> {
  const { data } = await api.post<{ is_liked: boolean; like_count: number }>(`/reels/${reelId}/like`);
  return data;
}

export async function viewReel(reelId: number): Promise<void> {
  await api.post(`/reels/${reelId}/view`, null, { params: { session_key: getSessionKey() } });
}

export async function getReelComments(reelId: number, page = 1): Promise<PaginatedResponse<ReelComment>> {
  const { data } = await api.get<PaginatedResponse<ReelComment>>(`/reels/${reelId}/comments`, {
    params: { page },
  });
  return data;
}

export async function addReelComment(reelId: number, content: string): Promise<ReelComment> {
  const { data } = await api.post<ReelComment>(`/reels/${reelId}/comments`, { content });
  return data;
}

export async function createReel(form: FormData): Promise<Reel> {
  const { data } = await api.post<Reel>('/reels', form);
  return data;
}
