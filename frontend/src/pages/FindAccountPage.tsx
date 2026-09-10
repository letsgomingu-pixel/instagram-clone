import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { InstagramLogo } from '@/components/common/InstagramLogo';
import { Button } from '@/components/common/Button';
import * as authApi from '@/api/auth';
import { cn } from '@/utils/cn';

type Tab = 'password' | 'username';

function emailErrorMessage(err: unknown): string | null {
  const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.status;
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  if (status === 503) {
    return typeof detail === 'string' ? detail : '이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }
  return null;
}

export function FindAccountPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'username' ? 'username' : 'password';
  const [tab, setTab] = useState<Tab>(initialTab);
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
      if (tab === 'password') {
        await authApi.forgotPassword(email.trim());
      } else {
        await authApi.forgotUsername(email.trim());
      }
      setSent(true);
      toast.success(
        tab === 'password'
          ? '재설정 안내를 발송했습니다. (등록된 이메일인 경우)'
          : '아이디 안내를 발송했습니다. (등록된 이메일인 경우)',
      );
    } catch (err: unknown) {
      const msg = emailErrorMessage(err);
      toast.error(msg ?? '요청에 실패했습니다.');
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
        <h1 className="text-center text-sm font-semibold mb-2">계정 찾기</h1>
        <p className="text-center text-xs text-ig-text-secondary mb-4 leading-relaxed">
          가입 시 사용한 이메일을 입력하세요.
        </p>

        <div className="flex border border-ig-border rounded-lg overflow-hidden mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('password'); setSent(false); }}
            className={cn(
              'flex-1 py-2.5 transition-colors',
              tab === 'password' ? 'bg-ig-text text-white' : 'bg-ig-secondary text-ig-text-secondary',
            )}
          >
            비밀번호 찾기
          </button>
          <button
            type="button"
            onClick={() => { setTab('username'); setSent(false); }}
            className={cn(
              'flex-1 py-2.5 transition-colors',
              tab === 'username' ? 'bg-ig-text text-white' : 'bg-ig-secondary text-ig-text-secondary',
            )}
          >
            아이디 찾기
          </button>
        </div>

        {sent ? (
          <p className="text-sm text-center text-ig-text-secondary mb-4 leading-relaxed">
            {tab === 'password'
              ? '등록된 이메일이라면 재설정 링크를 보냈습니다. 받은편지함과 스팸함을 확인해 주세요.'
              : '등록된 이메일이라면 사용자명(아이디)을 보냈습니다. 받은편지함과 스팸함을 확인해 주세요.'}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="가입 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs"
              aria-label="이메일"
            />
            <Button type="submit" fullWidth size="lg" loading={loading} disabled={!email.trim()}>
              {tab === 'password' ? '재설정 링크 보내기' : '아이디 안내 받기'}
            </Button>
          </form>
        )}

        <p className="text-xs text-ig-text-secondary text-center mt-4 leading-relaxed">
          사용자명을 알고 계시면 이메일 주소로도 로그인할 수 있습니다.
        </p>

        <Link to="/login" className="block text-xs text-ig-link text-center mt-4 hover:underline">
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
