import type { Conversation, Message } from '@/types';
import { api } from './client';

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await api.get<Conversation[]>('/conversations');
  return data;
}

export async function getMessages(username: string): Promise<Conversation> {
  const { data } = await api.get<Conversation>(`/conversations/${username}/messages`);
  return data;
}

export async function sendMessage(username: string, content: string): Promise<Message> {
  const { data } = await api.post<Message>(`/conversations/${username}/messages`, { content });
  return data;
}
