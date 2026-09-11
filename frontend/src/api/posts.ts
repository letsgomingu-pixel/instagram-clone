import type { Comment, FeedTab, PaginatedResponse, Post, User } from '@/types';
import { api } from './client';

export async function getFeed(
  page = 1,
  limit = 10,
  cursor?: string | null,
  tab: FeedTab = 'products',
): Promise<PaginatedResponse<Post>> {
  const params: Record<string, string | number> = { page, limit, tab };
  if (cursor) params.cursor = cursor;
  const { data } = await api.get<PaginatedResponse<Post>>('/posts/feed', { params });
  return data;
}

export async function getExplore(page = 1, limit = 30, tab: FeedTab = 'products'): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<Post>>('/posts/explore', { params: { page, limit, tab } });
  return data;
}

export async function getSavedPosts(page = 1): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<Post>>('/posts/saved', { params: { page, limit: 30 } });
  return data;
}

export async function getPost(postId: number): Promise<Post> {
  const { data } = await api.get<Post>(`/posts/${postId}`);
  return data;
}

export async function createPost(form: FormData): Promise<Post> {
  const { data } = await api.post<Post>('/posts', form);
  return data;
}

export interface CreateReviewPayload {
  order_id: number;
  rating: number;
  caption?: string;
  files: File[];
}

export async function createReview(payload: CreateReviewPayload): Promise<Post> {
  const form = new FormData();
  form.append('order_id', String(payload.order_id));
  form.append('rating', String(payload.rating));
  if (payload.caption) form.append('caption', payload.caption);
  payload.files.forEach((file) => form.append('files', file, file.name));
  const { data } = await api.post<Post>('/posts/reviews', form);
  return data;
}

export async function toggleLike(postId: number): Promise<{ is_liked: boolean; like_count: number }> {
  const { data } = await api.post<{ is_liked: boolean; like_count: number }>(`/posts/${postId}/like`);
  return data;
}

export async function toggleSave(postId: number): Promise<{ is_saved: boolean }> {
  const { data } = await api.post<{ is_saved: boolean }>(`/posts/${postId}/save`);
  return data;
}

export async function addComment(
  postId: number,
  content: string,
  parentId?: number | null,
): Promise<Comment> {
  const { data } = await api.post<Comment>(`/posts/${postId}/comments`, {
    content,
    parent_id: parentId ?? null,
  });
  return data;
}

export async function toggleCommentLike(
  postId: number,
  commentId: number,
): Promise<{ is_liked: boolean; like_count: number }> {
  const { data } = await api.post<{ is_liked: boolean; like_count: number }>(
    `/posts/${postId}/comments/${commentId}/like`,
  );
  return data;
}

export async function getPostLikes(postId: number, page = 1, limit = 50): Promise<PaginatedResponse<User>> {
  const { data } = await api.get<PaginatedResponse<User>>(`/posts/${postId}/likes`, { params: { page, limit } });
  return data;
}

export async function getPostComments(postId: number, page = 1, limit = 20): Promise<PaginatedResponse<Comment>> {
  const { data } = await api.get<PaginatedResponse<Comment>>(`/posts/${postId}/comments`, { params: { page, limit } });
  return data;
}

export async function deletePost(postId: number): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

export async function updatePost(
  postId: number,
  data: { caption?: string | null; location?: string | null },
): Promise<Post> {
  const { data: post } = await api.patch<Post>(`/posts/${postId}`, data);
  return post;
}

export async function archivePost(postId: number): Promise<Post> {
  const { data } = await api.post<Post>(`/posts/${postId}/archive`);
  return data;
}

export async function unarchivePost(postId: number): Promise<Post> {
  const { data } = await api.delete<Post>(`/posts/${postId}/archive`);
  return data;
}

export async function hidePost(postId: number): Promise<void> {
  await api.post(`/posts/${postId}/hide`);
}

export async function reportPost(postId: number, reason: string, details?: string): Promise<void> {
  await api.post(`/posts/${postId}/report`, { reason, details });
}

export async function getArchivedPosts(page = 1): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<Post>>('/posts/archived', { params: { page, limit: 30 } });
  return data;
}

export async function updateComment(
  postId: number,
  commentId: number,
  content: string,
): Promise<Comment> {
  const { data } = await api.patch<Comment>(`/posts/${postId}/comments/${commentId}`, { content });
  return data;
}

export async function deleteComment(postId: number, commentId: number): Promise<void> {
  await api.delete(`/posts/${postId}/comments/${commentId}`);
}
