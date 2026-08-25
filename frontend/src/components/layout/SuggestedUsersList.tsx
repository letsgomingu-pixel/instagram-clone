import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { useApp } from '@/contexts/AppContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { SuggestedUser } from '@/types';

interface SuggestedUsersListProps {
  compact?: boolean;
  refreshLimit?: number;
}

export function SuggestedUsersList({ compact = false, refreshLimit = 10 }: SuggestedUsersListProps) {
  const { suggestedUsers, followUser, unfollowUser, refreshSuggestedUsers } = useApp();
  const { requireAuth } = useRequireAuth();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const handleFollowClick = (suggested: SuggestedUser) => {
    requireAuth(async () => {
      setPendingId(suggested.id);
      try {
        if (suggested.is_following) {
          await unfollowUser(suggested.id);
        } else {
          await followUser(suggested.id);
        }
      } catch {
        toast.error('팔로우 상태를 변경하지 못했습니다. 다시 시도해 주세요.');
        return;
      } finally {
        setPendingId(null);
      }

      try {
        await refreshSuggestedUsers(refreshLimit);
      } catch {
        // Follow succeeded; list refresh can fail without rolling back the action.
      }
    });
  };

  if (suggestedUsers.length === 0) {
    return (
      <p className="text-sm text-ig-text-secondary py-2">
        지금은 추천할 계정이 없습니다. 탐색 탭에서 새로운 계정을 찾아보세요.
      </p>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-3'}>
      {suggestedUsers.map((suggested) => (
        <div key={suggested.id} className="flex items-center gap-3">
          <Link to={`/profile/${suggested.username}`}>
            <Avatar src={suggested.avatar_url} alt={suggested.username} size={compact ? 'sm' : 'md'} />
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to={`/profile/${suggested.username}`}
              className="text-sm font-semibold block truncate hover:underline"
            >
              {suggested.username}
            </Link>
            <span className="text-xs text-ig-text-secondary truncate block">
              {suggested.reason || suggested.full_name}
            </span>
          </div>
          <Button
            variant="text"
            size="sm"
            type="button"
            loading={pendingId === suggested.id}
            onClick={() => handleFollowClick(suggested)}
            className="text-xs font-semibold shrink-0"
          >
            {suggested.is_following ? '팔로잉' : '팔로우'}
          </Button>
        </div>
      ))}
    </div>
  );
}
