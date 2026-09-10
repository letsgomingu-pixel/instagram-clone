import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import * as usersApi from '@/api/users';
import type { User } from '@/types';

export function SettingsFollowRequestsPage() {
  const [requests, setRequests] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    usersApi
      .getFollowRequests()
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (user: User) => {
    if (busyIds.has(user.id)) return;
    setBusyIds((prev) => new Set(prev).add(user.id));
    try {
      await usersApi.acceptFollowRequestByUser(user.id);
      setRequests((prev) => prev.filter((u) => u.id !== user.id));
      toast.success(`${user.username}님의 팔로우 요청을 수락했습니다.`);
    } catch {
      toast.error('요청 수락에 실패했습니다.');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  const handleReject = async (user: User) => {
    if (busyIds.has(user.id)) return;
    setBusyIds((prev) => new Set(prev).add(user.id));
    try {
      await usersApi.rejectFollowRequestByUser(user.id);
      setRequests((prev) => prev.filter((u) => u.id !== user.id));
      toast.success('팔로우 요청을 거절했습니다.');
    } catch {
      toast.error('요청 거절에 실패했습니다.');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  return (
    <div className="max-w-[470px]">
      <h2 className="text-[20px] font-normal mb-1">팔로우 요청</h2>
      <p className="text-sm text-ig-text-secondary mb-6">
        비공개 계정으로 팔로우를 요청한 사용자를 확인하고 수락하거나 거절할 수 있습니다.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-ig-text-secondary text-center py-12">대기 중인 팔로우 요청이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-ig-border border border-ig-border rounded-lg overflow-hidden">
          {requests.map((user) => (
            <li key={user.id} className="flex items-center gap-3 px-4 py-3 bg-white">
              <Link to={`/profile/${user.username}`} className="shrink-0">
                <Avatar src={user.avatar_url} alt={user.username} size="md" />
              </Link>
              <Link to={`/profile/${user.username}`} className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.username}</p>
                <p className="text-xs text-ig-text-secondary truncate">{user.full_name}</p>
              </Link>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busyIds.has(user.id)}
                  onClick={() => void handleAccept(user)}
                >
                  수락
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyIds.has(user.id)}
                  onClick={() => void handleReject(user)}
                >
                  거절
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
