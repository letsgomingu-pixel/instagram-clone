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
      <div className="bg-white border border-ig-border rounded-sm px-10 py-10 mb-3">
        <div className="flex justify-center mb-6">
          <InstagramLogo className="text-5xl" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            placeholder="전화번호, 사용자 이름 또는 이메일"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-2 py-2 bg-ig-secondary border border-ig-border rounded-sm text-xs placeholder:text-ig-text-secondary"
            aria-label="사용자명 또는 이메일"
            disabled={requires2fa}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-2 py-2 bg-ig-secondary border border-ig-border rounded-sm text-xs placeholder:text-ig-text-secondary"
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
              className="w-full px-2 py-2 bg-ig-secondary border border-ig-border rounded-sm text-xs placeholder:text-ig-text-secondary"
              aria-label="2단계 인증 코드"
            />
          )}
          <Button type="submit" fullWidth size="lg" loading={isLoading} disabled={!username || !password}>
            로그인
          </Button>
        </form>

        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-ig-border" />
          <span className="text-sm font-semibold text-ig-text-secondary">또는</span>
          <div className="flex-1 h-px bg-ig-border" />
        </div>

        <button className="w-full text-ig-link text-sm font-semibold flex items-center justify-center gap-2 hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#385185">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          페이스북으로 로그인
        </button>

        <Link to="#" className="block text-xs text-ig-link text-center mt-4 hover:underline">
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <div className="bg-white border border-ig-border rounded-sm py-5 text-center text-sm">
        계정이 없으신가요?{' '}
        <Link to="/signup" className="text-ig-primary font-semibold hover:underline">
          가입하기
        </Link>
      </div>

      <p className="text-center text-xs text-ig-text-secondary mt-4">
        테스트 계정: letsgomingu@gmail.com / 12345
      </p>
    </div>
  );
}
