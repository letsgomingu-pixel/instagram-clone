import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { BrandIcon } from '@/components/common/InstagramLogo';
import { Button } from '@/components/common/Button';
import { authInputClassName, authInputStyle } from '@/components/auth/authInputStyle';
import { validateLogin } from '@/utils/validateForm';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateLogin(username, password);
    if (!validation.valid) {
      toast.error(validation.message!);
      return;
    }
    if (requires2fa && totpCode.length !== 6) {
      toast.error('6자리 인증 코드를 입력하세요.');
      return;
    }
    try {
      await login({
        username,
        password,
        ...(requires2fa ? { totp_code: totpCode, trust_device: trustDevice } : {}),
      });
      toast.success('로그인 성공!');
      navigate(from, { replace: true });
    } catch (error) {
      if (
        isAxiosError(error) &&
        error.response?.status === 403 &&
        typeof error.response.data?.detail === 'object' &&
        error.response.data.detail?.requires_2fa
      ) {
        setRequires2fa(true);
        toast('2단계 인증 코드를 입력하세요.');
        return;
      }
      if (isAxiosError(error) && !error.response) {
        toast.error('서버에 연결할 수 없습니다. npm run dev 로 백엔드가 실행 중인지 확인하세요.');
        return;
      }
      if (
        isAxiosError(error) &&
        error.response?.status === 403 &&
        typeof error.response.data?.detail === 'string'
      ) {
        // e.g. a deactivated account — don't let the generic
        // "wrong password" message mislead someone who typed it correctly.
        toast.error('이 계정은 사용이 중지되었습니다.');
        return;
      }
      toast.error('사용자명 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="w-full max-w-[350px]">
      <div className="bg-ig-surface border border-ig-border/80 rounded-2xl px-10 py-10 mb-3 shadow-[0_8px_32px_rgba(41,171,226,0.1)]">
        <div className="flex justify-center mb-6">
          <BrandIcon size={48} />
        </div>
        <p className="text-center text-xs text-ig-text-secondary mb-4 leading-relaxed">
          사진과 동영상을 공유하는 소셜 플랫폼
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            placeholder="사용자 이름 또는 이메일"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={authInputClassName}
            style={authInputStyle}
            name="username"
            size={1}
            lang="en"
            autoComplete="username"
            aria-label="사용자명 또는 이메일"
            disabled={requires2fa}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClassName}
            style={authInputStyle}
            name="password"
            size={1}
            autoComplete="current-password"
            aria-label="비밀번호"
            disabled={requires2fa}
          />
          {requires2fa && (
            <>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6자리 인증 코드"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className={authInputClassName}
                style={authInputStyle}
                size={1}
                aria-label="2단계 인증 코드"
              />
              <label className="flex items-center gap-2 text-xs text-ig-text-secondary px-1">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                />
                이 기기 저장 (다음 로그인 시 2단계 인증 건너뛰기)
              </label>
            </>
          )}
          <Button type="submit" fullWidth size="lg" loading={isLoading} disabled={!username || !password}>
            로그인
          </Button>
        </form>

        <Link to="/find-account" className="block text-xs text-ig-link text-center mt-4 hover:underline">
          아이디/비밀번호 찾기
        </Link>
        <p className="text-center text-[11px] text-ig-text-secondary mt-2 leading-relaxed">
          가입 이메일 주소로도 로그인할 수 있습니다.
        </p>
      </div>

      <div className="bg-ig-surface border border-ig-border/80 rounded-2xl py-5 text-center text-sm shadow-[0_4px_16px_rgba(41,171,226,0.06)]">
        계정이 없으신가요?{' '}
        <Link to="/signup" className="text-ig-primary font-semibold hover:underline">
          가입하기
        </Link>
      </div>

    </div>
  );
}
