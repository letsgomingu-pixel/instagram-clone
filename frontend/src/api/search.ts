import { api } from './client';
import type { HashtagSearchOut, ProductSearchOut, RecentSearchOut } from '@/types/search';
import type { Product } from '@/types';

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

export interface ProductSearchParams {
  q?: string;
  storage_type?: Product['storage_type'];
  availability?: Product['availability'];
  in_season?: boolean;
}

export async function searchProducts(params: ProductSearchParams): Promise<ProductSearchOut[]> {
  const { data } = await api.get<ProductSearchOut[]>('/search/products', { params });
  return data;
}
