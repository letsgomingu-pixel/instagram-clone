import type { PaginatedResponse, Post, Product, User } from '@/types';
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

export interface CreateProductPayload {
  name: string;
  price: number;
  unit: string;
  storage_type: Product['storage_type'];
  availability: Product['availability'];
  stock: number;
  season_start?: string;
  season_end?: string;
  caption?: string;
  location?: string;
  files: File[];
}

export async function createAdminProduct(payload: CreateProductPayload): Promise<Post> {
  const form = new FormData();
  form.append('name', payload.name);
  form.append('price', String(payload.price));
  form.append('unit', payload.unit);
  form.append('storage_type', payload.storage_type);
  form.append('availability', payload.availability);
  form.append('stock', String(payload.stock));
  if (payload.season_start) form.append('season_start', payload.season_start);
  if (payload.season_end) form.append('season_end', payload.season_end);
  if (payload.caption) form.append('caption', payload.caption);
  if (payload.location) form.append('location', payload.location);
  payload.files.forEach((file) => form.append('files', file, file.name));
  const { data } = await api.post<Post>('/admin/products', form);
  return data;
}

export async function getAdminProducts(page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<Post>>('/admin/products', { params: { page, limit } });
  return data;
}

export interface AdminOrder {
  id: number;
  user_id: number;
  username: string;
  product_id: number;
  product?: Product | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  status: string;
  shipping_name: string;
  phone: string;
  postcode: string;
  address_line1: string;
  address_line2: string;
  tracking_number?: string | null;
  created_at: string;
  paid_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
}

export async function getAdminOrders(
  page = 1,
  limit = 20,
  status?: string,
): Promise<PaginatedResponse<AdminOrder>> {
  const params: Record<string, string | number> = { page, limit };
  if (status) params.status = status;
  const { data } = await api.get<PaginatedResponse<AdminOrder>>('/admin/orders', { params });
  return data;
}

export async function updateAdminOrder(
  orderId: number,
  payload: { status?: 'preparing' | 'shipped' | 'delivered'; tracking_number?: string },
): Promise<AdminOrder> {
  const { data } = await api.patch<AdminOrder>(`/admin/orders/${orderId}`, payload);
  return data;
}
