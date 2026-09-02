import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as authApi from '@/api/auth';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';

export function AdminLoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username, password });
      const me = await authApi.getMe();
      if (!me.is_admin) {
        logout();
        toast.error('관리자 계정만 접근할 수 있습니다.');
        return;
      }

      const from = (location.state as { from?: string })?.from || '/admin';
      navigate(from, { replace: true });
      toast.success('관리자 로그인 성공');
    } catch {
      toast.error('아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1d21] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] bg-white rounded-xl border border-ig-border p-8 shadow-lg">
        <h1 className="text-2xl font-semibold mb-1">관리자 로그인</h1>
        <p className="text-sm text-ig-text-secondary mb-6">i am not a fishmonger Admin Console</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-username" className="block text-xs font-semibold mb-1">
              관리자 ID
            </label>
            <input
              id="admin-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-ig-border rounded-lg text-sm bg-ig-secondary"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold mb-1">
              비밀번호
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-ig-border rounded-lg text-sm bg-ig-secondary"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
          </Button>
        </form>

        <p className="text-xs text-ig-text-secondary mt-4 text-center">
          테스트: admin / pass123
        </p>
        <Link to="/" className="block text-center text-xs text-ig-primary mt-3 hover:underline">
          메인 사이트로 돌아가기
        </Link>
      </div>
    </div>
  );
}
