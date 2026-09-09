import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { InstagramLogo } from '@/components/common/InstagramLogo';
import { Button } from '@/components/common/Button';
import * as authApi from '@/api/auth';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== confirm) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!token) {
      toast.error('유효하지 않은 재설정 링크입니다.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('비밀번호가 변경되었습니다. 로그인해 주세요.');
      navigate('/login', { replace: true });
    } catch {
      toast.error('링크가 만료되었거나 유효하지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[350px] bg-ig-surface border border-ig-border rounded-xl px-10 py-10 shadow-sm">
        <div className="flex justify-center mb-6">
          <InstagramLogo className="text-[22px] leading-tight text-center" />
        </div>
        <h1 className="text-center text-sm font-semibold mb-6">새 비밀번호 설정</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="새 비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs"
            aria-label="새 비밀번호"
          />
          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs"
            aria-label="비밀번호 확인"
          />
          <Button type="submit" fullWidth size="lg" loading={loading} disabled={!password || !confirm}>
            비밀번호 변경
          </Button>
        </form>

        <Link to="/login" className="block text-xs text-ig-link text-center mt-6 hover:underline">
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
