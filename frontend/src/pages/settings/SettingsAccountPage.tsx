import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function SettingsAccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        <p className="text-[14px] text-ig-text-secondary">
          계정을 일시적으로 비활성화하거나 삭제할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
