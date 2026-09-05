import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { InstagramLogo } from '@/components/common/InstagramLogo';
import { Button } from '@/components/common/Button';
import { validateLogin } from '@/utils/validateForm';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
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
        ...(requires2fa ? { totp_code: totpCode } : {}),
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
      toast.error('사용자명 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="w-full max-w-[350px]">
      <div className="bg-white border border-ig-border rounded-xl px-10 py-10 mb-3 shadow-sm">
        <div className="flex justify-center mb-6">
          <InstagramLogo className="text-[22px] leading-tight text-center" />
        </div>
        <p className="text-center text-xs text-ig-text-secondary mb-4 leading-relaxed">
          수산물 도·소매 거래 플랫폼
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            placeholder="거래처 ID, 이메일 또는 연락처"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs placeholder:text-ig-text-secondary"
            aria-label="사용자명 또는 이메일"
            disabled={requires2fa}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs placeholder:text-ig-text-secondary"
            aria-label="비밀번호"
            disabled={requires2fa}
          />
          {requires2fa && (
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6자리 인증 코드"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs placeholder:text-ig-text-secondary"
              aria-label="2단계 인증 코드"
            />
          )}
          <Button type="submit" fullWidth size="lg" loading={isLoading} disabled={!username || !password}>
            로그인
          </Button>
        </form>

        <Link to="#" className="block text-xs text-ig-link text-center mt-4 hover:underline">
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <div className="bg-white border border-ig-border rounded-xl py-5 text-center text-sm shadow-sm">
        계정이 없으신가요?{' '}
        <Link to="/signup" className="text-ig-primary font-semibold hover:underline">
          거래처 등록
        </Link>
      </div>

      <p className="text-center text-xs text-ig-text-secondary mt-4">
        테스트 계정: letsgomingu@gmail.com / 12345
      </p>
    </div>
  );
}
