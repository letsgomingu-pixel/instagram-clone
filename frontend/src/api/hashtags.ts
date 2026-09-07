import type { HashtagPage } from '@/types';
import { api } from './client';

export async function getHashtagPage(tag: string, page = 1): Promise<HashtagPage> {
  const { data } = await api.get<HashtagPage>(`/hashtags/${encodeURIComponent(tag)}`, {
    params: { page, limit: 24 },
  });
  return data;
}
