import { useEffect, useState } from 'react';

import * as settingsApi from '@/api/settings';
import * as securityApi from '@/api/security';

import { Button } from '@/components/common/Button';
import { SettingsToggle } from '@/components/settings/SettingsToggle';

import toast from 'react-hot-toast';

function formatSessionTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function SettingsSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [security, setSecurity] = useState<securityApi.SecuritySummary | null>(null);
  const [sessions, setSessions] = useState<securityApi.LoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<securityApi.TwoFactorSetup | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  const loadSecurityData = async () => {
    const [summary, loginSessions] = await Promise.all([
      securityApi.getSecuritySummary(),
      securityApi.getLoginSessions(),
    ]);
    setSecurity(summary);
    setSessions(loginSessions);
  };

  useEffect(() => {
    loadSecurityData()
      .catch(() => toast.error('보안 설정을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setSavingPassword(true);
    try {
      await settingsApi.changePassword(currentPassword, newPassword);
      toast.success('비밀번호가 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('현재 비밀번호가 올바르지 않습니다.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleEmailAlertsToggle = async (enabled: boolean) => {
    if (!security) return;
    const prev = security;
    setSecurity({ ...security, login_email_alerts: enabled });
    setSavingAlerts(true);
    try {
      const updated = await securityApi.updateLoginEmailAlerts(enabled);
      setSecurity(updated);
    } catch {
      setSecurity(prev);
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setSavingAlerts(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    try {
      await securityApi.revokeLoginSession(sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      toast.success('로그인 세션이 종료되었습니다.');
    } catch {
      toast.error('세션을 종료하지 못했습니다.');
    }
  };

  const handleTrustSession = async (sessionId: number, isTrusted: boolean) => {
    try {
      const updated = await securityApi.updateLoginSessionTrust(sessionId, isTrusted);
      setSessions((prev) => prev.map((session) => (session.id === sessionId ? updated : session)));
      const summary = await securityApi.getSecuritySummary();
      setSecurity(summary);
    } catch {
      toast.error('저장된 로그인 설정을 변경하지 못했습니다.');
    }
  };

  const handleStartTwoFactor = async () => {
    setTwoFactorBusy(true);
    try {
      const setup = await securityApi.setupTwoFactor();
      setTwoFactorSetup(setup);
      setTwoFactorCode('');
      toast.success('인증 앱에 아래 키를 등록한 뒤 코드를 입력하세요.');
    } catch {
      toast.error('2FA 설정을 시작하지 못했습니다.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    if (twoFactorCode.length !== 6) {
      toast.error('6자리 인증 코드를 입력하세요.');
      return;
    }
    setTwoFactorBusy(true);
    try {
      const updated = await securityApi.enableTwoFactor(twoFactorCode);
      setSecurity(updated);
      setTwoFactorSetup(null);
      setTwoFactorCode('');
      toast.success('2단계 인증이 활성화되었습니다.');
    } catch {
      toast.error('인증 코드가 올바르지 않습니다.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (disableCode.length !== 6) {
      toast.error('6자리 인증 코드를 입력하세요.');
      return;
    }
    setTwoFactorBusy(true);
    try {
      const updated = await securityApi.disableTwoFactor(disablePassword, disableCode);
      setSecurity(updated);
      setDisablePassword('');
      setDisableCode('');
      toast.success('2단계 인증이 비활성화되었습니다.');
    } catch {
      toast.error('비밀번호 또는 인증 코드가 올바르지 않습니다.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  if (loading || !security) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  const trustedSessions = sessions.filter((session) => session.is_trusted);

  return (
    <div>
      <h2 className="text-[24px] font-normal mb-2 hidden md:block">보안</h2>
      <p className="text-[14px] text-ig-text-secondary mb-8">
        계정 보안 및 로그인 설정을 관리하세요.
      </p>

      <form onSubmit={handleSubmit} className="max-w-[460px] space-y-4">
        <h3 className="text-[16px] font-semibold pt-2">비밀번호 변경</h3>
        <input
          type="password"
          placeholder="현재 비밀번호"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full border border-ig-border rounded-lg px-3 py-2.5 text-sm"
          autoComplete="current-password"
        />
        <input
          type="password"
          placeholder="새 비밀번호 (8자 이상)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border border-ig-border rounded-lg px-3 py-2.5 text-sm"
          autoComplete="new-password"
        />
        <input
          type="password"
          placeholder="새 비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-ig-border rounded-lg px-3 py-2.5 text-sm"
          autoComplete="new-password"
        />
        <Button type="submit" variant="primary" size="md" disabled={savingPassword}>
          {savingPassword ? '저장 중...' : '비밀번호 변경'}
        </Button>
      </form>

      <div className="divide-y divide-ig-border max-w-[640px] mt-10">
        <section className="py-6">
          <h3 className="text-[16px] font-semibold mb-2">로그인 활동</h3>
          <p className="text-sm text-ig-text-secondary mb-4">
            최근 {security.recent_login_count}개의 로그인 기록
          </p>
          {sessions.length === 0 ? (
            <p className="text-sm text-ig-text-secondary">로그인 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-col gap-2 rounded-lg border border-ig-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {session.device_name}
                      {session.is_current ? ' · 현재 세션' : ''}
                      {session.is_trusted ? ' · 저장됨' : ''}
                    </p>
                    <p className="text-xs text-ig-text-secondary">
                      {session.ip_address}
                      {session.location ? ` · ${session.location}` : ''} ·{' '}
                      {formatSessionTime(session.last_active_at)}
                    </p>
                  </div>
                  {!session.is_current && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      로그아웃
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="py-6">
          <h3 className="text-[16px] font-semibold mb-2">저장된 로그인 정보</h3>
          <p className="text-sm text-ig-text-secondary mb-4">
            신뢰하는 기기 {security.trusted_session_count}대
          </p>
          {trustedSessions.length === 0 ? (
            <p className="text-sm text-ig-text-secondary">저장된 로그인 기기가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {trustedSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-col gap-2 rounded-lg border border-ig-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">{session.device_name}</p>
                    <p className="text-xs text-ig-text-secondary">
                      {formatSessionTime(session.created_at)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTrustSession(session.id, false)}
                  >
                    저장 해제
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {sessions.some((session) => !session.is_trusted) && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-ig-text-secondary">다른 세션을 저장된 로그인으로 표시:</p>
              {sessions
                .filter((session) => !session.is_trusted)
                .map((session) => (
                  <div
                    key={`trust-${session.id}`}
                    className="flex items-center justify-between rounded-lg border border-ig-border px-4 py-2"
                  >
                    <span className="text-sm">{session.device_name}</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTrustSession(session.id, true)}
                    >
                      저장
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="py-6">
          <div className="flex items-center justify-between gap-4 max-w-[460px]">
            <div>
              <p className="text-[16px] font-semibold">이메일에서 받은 메시지</p>
              <p className="text-[14px] text-ig-text-secondary mt-0.5">
                새 기기에서 로그인할 때 이메일 알림을 받습니다.
              </p>
            </div>
            <SettingsToggle
              checked={security.login_email_alerts}
              disabled={savingAlerts}
              onChange={(value) => void handleEmailAlertsToggle(value)}
            />
          </div>
        </section>

        <section className="py-6 space-y-4">
          <div>
            <h3 className="text-[16px] font-semibold">인증 앱</h3>
            <p className="text-sm text-ig-text-secondary mt-1">
              {security.two_factor_enabled
                ? '2단계 인증이 활성화되어 있습니다.'
                : '인증 앱으로 로그인 시 추가 코드를 요구합니다.'}
            </p>
          </div>

          {!security.two_factor_enabled && !twoFactorSetup && (
            <Button type="button" variant="primary" size="md" disabled={twoFactorBusy} onClick={handleStartTwoFactor}>
              2단계 인증 설정
            </Button>
          )}

          {twoFactorSetup && (
            <div className="rounded-lg border border-ig-border p-4 space-y-3">
              <p className="text-sm">인증 앱에 아래 키를 등록하세요.</p>
              <code className="block break-all rounded bg-ig-secondary px-3 py-2 text-xs">
                {twoFactorSetup.secret}
              </code>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6자리 인증 코드"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-ig-border rounded-lg px-3 py-2.5 text-sm"
              />
              <div className="flex gap-2">
                <Button type="button" variant="primary" size="md" disabled={twoFactorBusy} onClick={handleEnableTwoFactor}>
                  활성화
                </Button>
                <Button type="button" variant="secondary" size="md" onClick={() => setTwoFactorSetup(null)}>
                  취소
                </Button>
              </div>
            </div>
          )}

          {security.two_factor_enabled && (
            <div className="rounded-lg border border-ig-border p-4 space-y-3 max-w-[460px]">
              <input
                type="password"
                placeholder="현재 비밀번호"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="w-full border border-ig-border rounded-lg px-3 py-2.5 text-sm"
              />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6자리 인증 코드"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-ig-border rounded-lg px-3 py-2.5 text-sm"
              />
              <Button type="button" variant="secondary" size="md" disabled={twoFactorBusy} onClick={handleDisableTwoFactor}>
                2단계 인증 비활성화
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
