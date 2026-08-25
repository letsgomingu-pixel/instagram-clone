import type { PaginatedResponse, Post, Reel, SuggestedUser, User } from '@/types';
import { api } from './client';

export async function getUserProfile(username: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${username}`);
  return data;
}

export async function updateProfile(payload: {
  full_name?: string;
  bio?: string;
  website?: string;
}): Promise<User> {
  const { data } = await api.put<User>('/users/me', payload);
  return data;
}

export async function uploadAvatar(file: File): Promise<User> {
  const form = new FormData();
  form.append('avatar', file, file.name);
  const { data } = await api.post<User>('/users/me/avatar', form);
  return data;
}

export async function checkUsername(username: string): Promise<boolean> {
  const { data } = await api.get<{ available: boolean }>('/users/check-username', {
    params: { username },
  });
  return data.available;
}

export async function getSuggestedUsers(limit = 10): Promise<SuggestedUser[]> {
  const { data } = await api.get<SuggestedUser[]>('/users/suggested', { params: { limit } });
  return data;
}

export async function followUser(userId: number): Promise<void> {
  await api.post(`/users/${userId}/follow`);
}

export async function unfollowUser(userId: number): Promise<void> {
  await api.delete(`/users/${userId}/follow`);
}

export async function getUserPosts(username: string, page = 1): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<Post>>(`/users/${username}/posts`, {
    params: { page, limit: 30 },
  });
  return data;
}

export async function getUserReels(username: string, page = 1): Promise<PaginatedResponse<Reel>> {
  const { data } = await api.get<PaginatedResponse<Reel>>(`/users/${username}/reels`, {
    params: { page, limit: 30 },
  });
  return data;
}

export async function getUserTaggedPosts(username: string, page = 1): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<Post>>(`/users/${username}/tagged`, {
    params: { page, limit: 30 },
  });
  return data;
}

export async function searchUsersApi(q: string): Promise<User[]> {
  const { data } = await api.get<User[]>('/search/users', { params: { q } });
  return data;
}
