import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { InstagramLogo } from '@/components/common/InstagramLogo';
import { Button } from '@/components/common/Button';
import * as authApi from '@/api/auth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('이메일을 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
      toast.success('재설정 안내를 발송했습니다. (등록된 이메일인 경우)');
    } catch {
      toast.error('요청에 실패했습니다.');
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
        <h1 className="text-center text-sm font-semibold mb-2">비밀번호 찾기</h1>
        <p className="text-center text-xs text-ig-text-secondary mb-6 leading-relaxed">
          가입 시 사용한 이메일을 입력하세요. 재설정 링크를 보내드립니다.
        </p>

        {sent ? (
          <p className="text-sm text-center text-ig-text-secondary mb-4">
            이메일을 확인해 주세요. SMTP가 설정되지 않은 개발 환경에서는 서버 로그에 링크가 출력됩니다.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs"
              aria-label="이메일"
            />
            <Button type="submit" fullWidth size="lg" loading={loading} disabled={!email.trim()}>
              재설정 링크 보내기
            </Button>
          </form>
        )}

        <Link to="/login" className="block text-xs text-ig-link text-center mt-6 hover:underline">
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
