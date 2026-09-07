import { api } from './client';
import type { HashtagSearchOut, RecentSearchOut } from '@/types/search';

export async function getRecentSearches(): Promise<RecentSearchOut[]> {
  const { data } = await api.get<RecentSearchOut[]>('/search/recent');
  return data;
}

export async function clearRecentSearches(): Promise<void> {
  await api.delete('/search/recent');
}

export async function deleteRecentSearch(id: number): Promise<void> {
  await api.delete(`/search/recent/${id}`);
}

export async function searchHashtags(q: string): Promise<HashtagSearchOut[]> {
  const { data } = await api.get<HashtagSearchOut[]>('/search/hashtags', { params: { q } });
  return data;
}
