import { api } from './client';
import type { CollectionOut } from '@/types/search';
import type { PaginatedResponse, Post } from '@/types';

export async function getCollections(): Promise<CollectionOut[]> {
  const { data } = await api.get<CollectionOut[]>('/collections');
  return data;
}

export async function createCollection(name: string): Promise<CollectionOut> {
  const { data } = await api.post<CollectionOut>('/collections', { name });
  return data;
}

export async function addPostToCollection(collectionId: number, postId: number): Promise<void> {
  await api.post(`/collections/${collectionId}/posts/${postId}`);
}

export async function getCollectionPosts(
  collectionId: number,
  page = 1,
): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<Post>>(`/collections/${collectionId}/posts`, {
    params: { page },
  });
  return data;
}
