import { Link } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { SuggestedUsersList } from '@/components/layout/SuggestedUsersList';
import { useAuth } from '@/hooks/useAuth';

export function SuggestionsPanel() {
  const { user, isAuthenticated } = useAuth();

  return (
    <aside className="hidden lg:block w-[320px] pt-8 pl-8">
      {isAuthenticated ? (
        <div className="flex items-center gap-3 mb-6">
          <Link to={`/profile/${user?.username}`}>
            <Avatar src={user?.avatar_url} alt={user?.username || ''} size="md" />
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/profile/${user?.username}`} className="text-sm font-semibold block truncate hover:underline">
              {user?.username}
            </Link>
            <span className="text-sm text-ig-text-secondary truncate block">{user?.full_name}</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-ig-border rounded-xl p-4 mb-6 shadow-sm">
          <p className="text-sm font-semibold mb-1">i am not a fishmonger에 오신 것을 환영합니다</p>
          <p className="text-xs text-ig-text-secondary mb-3">
            도·소매 수산물 거래처와 입고 소식을 확인해 보세요.
          </p>
          <div className="flex gap-2">
            <Link to="/login" className="flex-1">
              <Button variant="primary" size="sm" fullWidth>로그인</Button>
            </Link>
            <Link to="/signup" className="flex-1">
              <Button variant="secondary" size="sm" fullWidth>가입하기</Button>
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-ig-text-secondary">추천 거래처</span>
        <Link to="/suggested" className="text-xs font-semibold text-ig-text hover:text-ig-text-secondary">
          모두 보기
        </Link>
      </div>

      <SuggestedUsersList />
    </aside>
  );
}
