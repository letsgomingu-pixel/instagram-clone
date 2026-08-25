import { Link } from 'react-router-dom';
import { SuggestedUsersList } from '@/components/layout/SuggestedUsersList';

export function SuggestedUsersStrip() {
  return (
    <section className="lg:hidden feed-card px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-ig-text-secondary">회원님을 위한 추천</span>
        <Link to="/suggested" className="text-xs font-semibold text-ig-text hover:text-ig-text-secondary">
          모두 보기
        </Link>
      </div>
      <SuggestedUsersList compact />
    </section>
  );
}
