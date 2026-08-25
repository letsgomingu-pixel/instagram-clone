import type { PaginatedResponse, Post, User } from '@/types';
import { api } from './client';

export interface AdminStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  new_users_7d: number;
  total_posts: number;
  total_comments: number;
  total_likes: number;
  posts_7d: number;
}

export interface AdminUser extends User {
  is_active: boolean;
  created_at: string;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>('/admin/stats');
  return data;
}

export async function getAdminUsers(page = 1, limit = 20): Promise<PaginatedResponse<AdminUser>> {
  const { data } = await api.get<PaginatedResponse<AdminUser>>('/admin/users', { params: { page, limit } });
  return data;
}

export async function updateAdminUserStatus(userId: number, is_active: boolean): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/admin/users/${userId}/status`, { is_active });
  return data;
}

export async function deleteAdminUser(userId: number): Promise<void> {
  await api.delete(`/admin/users/${userId}`);
}

export async function getAdminPosts(page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<Post>>('/admin/posts', { params: { page, limit } });
  return data;
}

export async function deleteAdminPost(postId: number): Promise<void> {
  await api.delete(`/admin/posts/${postId}`);
}
