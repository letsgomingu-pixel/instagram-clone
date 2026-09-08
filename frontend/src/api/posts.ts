import type { Comment, PaginatedResponse, Post, User } from '@/types';
import { api } from './client';

export async function getFeed(
  page = 1,
  limit = 10,
  cursor?: string | null,
): Promise<PaginatedResponse<Post>> {
  const params: Record<string, string | number> = { page, limit };
  if (cursor) params.cursor = cursor;
  const { data } = await api.get<PaginatedResponse<Post>>('/posts/feed', { params });
  return data;
}

export async function getExplore(page = 1, limit = 30): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<Post>>('/posts/explore', { params: { page, limit } });
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

export async function deleteComment(postId: number, commentId: number): Promise<void> {
  await api.delete(`/posts/${postId}/comments/${commentId}`);
}
