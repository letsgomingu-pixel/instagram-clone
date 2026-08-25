import { useEffect, useState } from 'react';
import { getAdminStats, type AdminStats } from '@/api/admin';
import { Spinner } from '@/components/common/Spinner';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-ig-border rounded-xl p-5">
      <p className="text-sm text-ig-text-secondary mb-2">{label}</p>
      <p className="text-3xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-sm text-ig-text-secondary">통계를 불러오지 못했습니다.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">통계 대시보드</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-ig-text-secondary mb-3 uppercase tracking-wide">회원</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="전체 회원" value={stats.total_users} />
          <StatCard label="활성 회원" value={stats.active_users} />
          <StatCard label="탈퇴/비활성" value={stats.inactive_users} />
          <StatCard label="최근 7일 가입" value={stats.new_users_7d} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ig-text-secondary mb-3 uppercase tracking-wide">콘텐츠</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="전체 게시물" value={stats.total_posts} />
          <StatCard label="최근 7일 게시물" value={stats.posts_7d} />
          <StatCard label="전체 댓글" value={stats.total_comments} />
          <StatCard label="전체 좋아요" value={stats.total_likes} />
        </div>
      </section>
    </div>
  );
}
