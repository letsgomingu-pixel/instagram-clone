import type { AuthCredentials, RegisterData, User } from '@/types';
import { api } from './client';

export async function login(
  credentials: AuthCredentials,
): Promise<{ access_token: string; user: User; trust_token?: string | null }> {
  const storedTrust = localStorage.getItem('trust_token');
  const { data } = await api.post<{
    access_token: string;
    token_type: string;
    user: User;
    trust_token?: string | null;
  }>('/auth/login', {
    ...credentials,
    trusted_device_token: credentials.trusted_device_token ?? storedTrust ?? undefined,
  });
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('userId', String(data.user.id));
  if (data.trust_token) {
    localStorage.setItem('trust_token', data.trust_token);
  }
  return { access_token: data.access_token, user: data.user, trust_token: data.trust_token };
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

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function forgotUsername(email: string): Promise<void> {
  await api.post('/auth/forgot-username', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post('/auth/reset-password', { token, password });
}
