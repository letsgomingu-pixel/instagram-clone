import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { deleteAdminUser,
  getAdminUsers,
  updateAdminUserStatus,
  type AdminUser,
} from '@/api/admin';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { formatRelativeTime } from '@/utils/formatDate';

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = () => {
    setLoading(true);
    getAdminUsers(page, limit)
      .then((data) => {
        setUsers(data.items);
        setTotal(data.total);
      })
      .catch(() => toast.error('회원 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  const handleDeactivate = async (user: AdminUser) => {
    if (!window.confirm(`@${user.username} 회원을 탈퇴(비활성) 처리할까요?`)) return;
    try {
      await updateAdminUserStatus(user.id, false);
      toast.success('회원이 비활성화되었습니다.');
      load();
    } catch {
      toast.error('처리에 실패했습니다.');
    }
  };

  const handleActivate = async (user: AdminUser) => {
    try {
      await updateAdminUserStatus(user.id, true);
      toast.success('회원이 활성화되었습니다.');
      load();
    } catch {
      toast.error('처리에 실패했습니다.');
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`@${user.username} 회원을 완전히 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try {
      await deleteAdminUser(user.id);
      toast.success('회원이 삭제되었습니다.');
      load();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">회원 관리</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="bg-white border border-ig-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ig-secondary text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">사용자명</th>
                  <th className="px-4 py-3 font-semibold">이메일</th>
                  <th className="px-4 py-3 font-semibold">가입일</th>
                  <th className="px-4 py-3 font-semibold">게시물</th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="px-4 py-3 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-ig-border">
                    <td className="px-4 py-3">{user.id}</td>
                    <td className="px-4 py-3 font-medium">
                      @{user.username}
                      {user.is_admin && (
                        <span className="ml-2 text-xs text-sky-600 font-semibold">ADMIN</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ig-text-secondary">{user.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      <span className="block text-xs text-ig-text-secondary">
                        {formatRelativeTime(user.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{user.post_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          user.is_active
                            ? 'text-green-600 font-medium'
                            : 'text-ig-text-secondary font-medium'
                        }
                      >
                        {user.is_active ? '활성' : '탈퇴/비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {user.is_active ? (
                          !user.is_admin && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeactivate(user)}
                            >
                              탈퇴
                            </Button>
                          )
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => handleActivate(user)}>
                            복구
                          </Button>
                        )}
                        {!user.is_admin && (
                          <Button variant="secondary" size="sm" onClick={() => handleDelete(user)}>
                            삭제
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-ig-border">
            <p className="text-xs text-ig-text-secondary">총 {total.toLocaleString()}명</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                이전
              </Button>
              <span className="text-xs self-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
