import type { PaginatedResponse, Post, Reel, SuggestedUser, User } from '@/types';
import { api } from './client';

export async function getUserProfile(username: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${username}`);
  return data;
}

export async function updateProfile(payload: {
  username?: string;
  full_name?: string;
  bio?: string;
  website?: string;
  phone?: string;
  postcode?: string;
  address_line1?: string;
  address_line2?: string;
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

export async function followUser(userId: number): Promise<{ is_following: boolean; is_requested: boolean }> {
  const { data } = await api.post<{ is_following: boolean; is_requested: boolean }>(`/users/${userId}/follow`);
  return data;
}

export async function unfollowUser(userId: number): Promise<{ is_following: boolean; is_requested: boolean }> {
  const { data } = await api.delete<{ is_following: boolean; is_requested: boolean }>(`/users/${userId}/follow`);
  return data;
}

export async function getFollowRequests(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users/me/follow-requests');
  return data;
}

export async function acceptFollowRequest(requestId: number): Promise<User> {
  const { data } = await api.post<User>(`/users/me/follow-requests/${requestId}/accept`);
  return data;
}

export async function rejectFollowRequest(requestId: number): Promise<void> {
  await api.delete(`/users/me/follow-requests/${requestId}`);
}

export async function acceptFollowRequestByUser(requesterId: number): Promise<User> {
  const { data } = await api.post<User>(`/users/me/follow-requests/by-user/${requesterId}/accept`);
  return data;
}

export async function rejectFollowRequestByUser(requesterId: number): Promise<void> {
  await api.delete(`/users/me/follow-requests/by-user/${requesterId}`);
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

export async function getFollowers(username: string, page = 1): Promise<PaginatedResponse<User>> {
  const { data } = await api.get<PaginatedResponse<User>>(`/users/${username}/followers`, {
    params: { page, limit: 30 },
  });
  return data;
}

export async function getFollowing(username: string, page = 1): Promise<PaginatedResponse<User>> {
  const { data } = await api.get<PaginatedResponse<User>>(`/users/${username}/following`, {
    params: { page, limit: 30 },
  });
  return data;
}

export async function searchUsersApi(q: string): Promise<User[]> {
  const { data } = await api.get<User[]>('/search/users', { params: { q } });
  return data;
}

export async function blockUser(userId: number): Promise<void> {
  await api.post(`/users/${userId}/block`);
}

export async function unblockUser(userId: number): Promise<void> {
  await api.delete(`/users/${userId}/block`);
}

export async function getBlockStatus(userId: number): Promise<{ is_blocked: boolean; blocked_by_me: boolean }> {
  const { data } = await api.get<{ is_blocked: boolean; blocked_by_me: boolean }>(`/users/${userId}/block-status`);
  return data;
}

export async function getBlockedUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users/me/blocked');
  return data;
}

export async function deactivateAccount(password: string): Promise<void> {
  await api.post('/users/me/deactivate', { password });
}
