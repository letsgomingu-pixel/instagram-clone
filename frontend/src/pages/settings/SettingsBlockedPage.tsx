import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/common/Avatar';
import * as usersApi from '@/api/users';

export function SettingsBlockedPage() {
  const [users, setUsers] = useState<Awaited<ReturnType<typeof usersApi.getBlockedUsers>>>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    usersApi
      .getBlockedUsers()
      .then(setUsers)
      .catch(() => toast.error('차단 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleUnblock = async (userId: number, username: string) => {
    setBusyId(userId);
    try {
      await usersApi.unblockUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success(`${username}님 차단을 해제했습니다.`);
    } catch {
      toast.error('차단 해제에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[24px] font-normal mb-2 hidden md:block">차단한 계정</h2>
      <p className="text-[14px] text-ig-text-secondary mb-8">
        차단한 사람은 회원님의 프로필과 게시물을 찾을 수 없습니다.
      </p>

      {users.length === 0 ? (
        <p className="text-[14px] text-ig-text-secondary py-8 text-center">차단한 계정이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-ig-border max-w-[460px]">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-3 py-4">
              <Link to={`/profile/${user.username}`} className="shrink-0">
                <Avatar src={user.avatar_url} alt={user.username} size="md" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${user.username}`} className="text-[14px] font-semibold hover:underline block truncate">
                  {user.username}
                </Link>
                <p className="text-[14px] text-ig-text-secondary truncate">{user.full_name}</p>
              </div>
              <button
                type="button"
                disabled={busyId === user.id}
                onClick={() => void handleUnblock(user.id, user.username)}
                className="h-8 px-4 text-[14px] font-semibold rounded-lg bg-ig-secondary hover:bg-[#dbdbdb] disabled:opacity-50 shrink-0"
              >
                차단 해제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
