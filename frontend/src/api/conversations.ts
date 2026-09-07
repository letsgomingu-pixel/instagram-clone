import type { Conversation, Message, User } from '@/types';
import { api } from './client';

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await api.get<Conversation[]>('/conversations');
  return data;
}

export async function getMessages(
  username: string,
  beforeId?: number,
  limit = 50,
): Promise<Conversation> {
  const { data } = await api.get<Conversation>(`/conversations/${username}/messages`, {
    params: { before_id: beforeId, limit },
  });
  return data;
}

export async function sendMessage(username: string, content: string): Promise<Message> {
  const { data } = await api.post<Message>(`/conversations/${username}/messages`, { content });
  return data;
}

export async function sendMessageWithImage(username: string, file: File, content?: string): Promise<Message> {
  const form = new FormData();
  if (content) form.append('content', content);
  form.append('image', file);
  const { data } = await api.post<Message>(`/conversations/${username}/messages`, form);
  return data;
}

export async function deleteMessage(messageId: number): Promise<void> {
  await api.delete(`/conversations/messages/${messageId}`);
}

export async function createGroupConversation(
  usernames: string[],
  title?: string,
): Promise<Conversation> {
  const { data } = await api.post<Conversation>('/conversations/group', { usernames, title });
  return data;
}

export async function getGroupMessages(
  conversationId: number,
  beforeId?: number,
  limit = 50,
): Promise<Conversation> {
  const { data } = await api.get<Conversation>(`/conversations/group/${conversationId}/messages`, {
    params: { before_id: beforeId, limit },
  });
  return data;
}

export async function sendGroupMessage(conversationId: number, content: string): Promise<Message> {
  const { data } = await api.post<Message>(`/conversations/group/${conversationId}/messages`, { content });
  return data;
}

export async function sendGroupMessageWithImage(
  conversationId: number,
  file: File,
  content?: string,
): Promise<Message> {
  const form = new FormData();
  if (content) form.append('content', content);
  form.append('image', file);
  const { data } = await api.post<Message>(`/conversations/group/${conversationId}/messages`, form);
  return data;
}

export async function getGroupParticipants(conversationId: number): Promise<User[]> {
  const { data } = await api.get<User[]>(`/conversations/group/${conversationId}/participants`);
  return data;
}
