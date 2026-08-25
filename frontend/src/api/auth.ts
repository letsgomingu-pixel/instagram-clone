import type { AuthCredentials, RegisterData, User } from '@/types';
import { api } from './client';

export async function login(credentials: AuthCredentials): Promise<{ access_token: string; user: User }> {
  const { data } = await api.post<{ access_token: string; token_type: string; user: User }>(
    '/auth/login',
    credentials,
  );
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('userId', String(data.user.id));
  return { access_token: data.access_token, user: data.user };
}

export async function register(payload: RegisterData): Promise<{ access_token: string; user: User }> {
  const { data } = await api.post<{ access_token: string; token_type: string; user: User }>(
    '/auth/register',
    payload,
  );
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('userId', String(data.user.id));
  return { access_token: data.access_token, user: data.user };
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export function logoutApi(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
}
