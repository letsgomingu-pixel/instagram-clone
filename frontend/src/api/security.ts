import { api } from './client';

export interface SecuritySummary {
  login_email_alerts: boolean;
  two_factor_enabled: boolean;
  trusted_session_count: number;
  recent_login_count: number;
}

export interface LoginSession {
  id: number;
  device_name: string;
  ip_address: string;
  location: string | null;
  is_trusted: boolean;
  is_current: boolean;
  created_at: string;
  last_active_at: string;
}

export interface TwoFactorSetup {
  secret: string;
  otpauth_url: string;
}

export async function getSecuritySummary(): Promise<SecuritySummary> {
  const { data } = await api.get<SecuritySummary>('/users/me/security');
  return data;
}

export async function getLoginSessions(): Promise<LoginSession[]> {
  const { data } = await api.get<LoginSession[]>('/users/me/login-sessions');
  return data;
}

export async function revokeLoginSession(sessionId: number): Promise<void> {
  await api.delete(`/users/me/login-sessions/${sessionId}`);
}

export async function updateLoginSessionTrust(sessionId: number, isTrusted: boolean): Promise<LoginSession> {
  const { data } = await api.patch<LoginSession>(`/users/me/login-sessions/${sessionId}`, {
    is_trusted: isTrusted,
  });
  return data;
}

export async function updateLoginEmailAlerts(enabled: boolean): Promise<SecuritySummary> {
  const { data } = await api.put<SecuritySummary>('/users/me/security/login-email-alerts', { enabled });
  return data;
}

export async function setupTwoFactor(): Promise<TwoFactorSetup> {
  const { data } = await api.post<TwoFactorSetup>('/users/me/security/2fa/setup');
  return data;
}

export async function enableTwoFactor(code: string): Promise<SecuritySummary> {
  const { data } = await api.post<SecuritySummary>('/users/me/security/2fa/enable', { code });
  return data;
}

export async function disableTwoFactor(password: string, code: string): Promise<SecuritySummary> {
  const { data } = await api.delete<SecuritySummary>('/users/me/security/2fa', {
    data: { password, code },
  });
  return data;
}
