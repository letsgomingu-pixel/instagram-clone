import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import * as usersApi from '@/api/users';

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return '계정 비활성화에 실패했습니다.';
}

export function SettingsAccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeactivate = async () => {
    if (!password) {
      toast.error('비밀번호를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await usersApi.deactivateAccount(password);
      toast.success('계정이 비활성화되었습니다.');
      logout();
      navigate('/login');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-[24px] font-normal mb-8 hidden md:block">계정 정보</h2>

      <div className="space-y-6 max-w-[460px]">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
          <span className="md:w-[194px] md:text-right text-[16px] font-semibold shrink-0">사용자명</span>
          <span className="text-[16px]">{user?.username}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
          <span className="md:w-[194px] md:text-right text-[16px] font-semibold shrink-0">이메일</span>
          <span className="text-[16px]">{user?.email}</span>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-ig-border max-w-[460px] space-y-4">
        <button
          type="button"
          onClick={handleLogout}
          className="text-[14px] font-semibold text-ig-primary hover:text-ig-primary-hover"
        >
          로그아웃
        </button>

        {!showDeactivate ? (
          <div>
            <p className="text-[14px] text-ig-text-secondary mb-2">
              계정을 일시적으로 비활성화할 수 있습니다. 비활성화하면 즉시 로그아웃되며, 다시 로그인하기 전까지
              다른 사람에게 프로필과 게시물이 표시되지 않습니다.
            </p>
            <button
              type="button"
              onClick={() => setShowDeactivate(true)}
              className="text-[14px] font-semibold text-ig-red hover:opacity-80"
            >
              계정 비활성화
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-ig-border p-4 space-y-3">
            <p className="text-[14px]">
              계속하려면 비밀번호를 입력해 주세요. 관리자 계정은 비활성화할 수 없습니다.
            </p>
            <input
              type="password"
              placeholder="현재 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-ig-border rounded-lg px-3 py-2.5 text-sm"
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="md" disabled={submitting} onClick={handleDeactivate}>
                비활성화 확인
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setShowDeactivate(false);
                  setPassword('');
                }}
              >
                취소
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
