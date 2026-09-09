import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  deleteAdminPost,
  deleteAdminReel,
  getAdminPostReports,
  getAdminReelReports,
  getAdminUserReports,
  updateAdminUserStatus,
} from '@/api/admin';
import { MediaImage } from '@/components/common/MediaImage';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { formatRelativeTime } from '@/utils/formatDate';

type Tab = 'posts' | 'users' | 'reels';

export function AdminReportsPage() {
  const [tab, setTab] = useState<Tab>('posts');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [postReports, setPostReports] = useState<Awaited<ReturnType<typeof getAdminPostReports>>['items']>([]);
  const [userReports, setUserReports] = useState<Awaited<ReturnType<typeof getAdminUserReports>>['items']>([]);
  const [reelReports, setReelReports] = useState<Awaited<ReturnType<typeof getAdminReelReports>>['items']>([]);
  const limit = 15;

  const load = () => {
    setLoading(true);
    const fetcher =
      tab === 'posts' ? getAdminPostReports : tab === 'users' ? getAdminUserReports : getAdminReelReports;
    fetcher(page, limit)
      .then((data) => {
        setTotal(data.total);
        if (tab === 'posts') setPostReports(data.items as typeof postReports);
        else if (tab === 'users') setUserReports(data.items as typeof userReports);
        else setReelReports(data.items as typeof reelReports);
      })
      .catch(() => toast.error('신고 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tab, page]);

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm(`게시물 #${postId}을(를) 삭제할까요?`)) return;
    try {
      await deleteAdminPost(postId);
      toast.success('게시물이 삭제되었습니다.');
      load();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleDeactivateUser = async (userId: number, username: string) => {
    if (!window.confirm(`@${username} 계정을 비활성화할까요?`)) return;
    try {
      await updateAdminUserStatus(userId, false);
      toast.success('계정이 비활성화되었습니다.');
      load();
    } catch {
      toast.error('처리에 실패했습니다.');
    }
  };

  const handleDeleteReel = async (reelId: number) => {
    if (!window.confirm(`릴스 #${reelId}을(를) 삭제할까요?`)) return;
    try {
      await deleteAdminReel(reelId);
      toast.success('릴스가 삭제되었습니다.');
      load();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">신고 관리</h1>

      <div className="flex gap-2 mb-6">
        {(['posts', 'users', 'reels'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t ? 'bg-[#1a1d21] text-white' : 'bg-white border border-ig-border'}`}
          >
            {t === 'posts' ? '게시물' : t === 'users' ? '계정' : '릴스'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="space-y-3">
          {tab === 'posts' && postReports.map((r) => (
            <article key={r.id} className="bg-white border border-ig-border rounded-xl p-4 flex gap-4">
              <div className="w-20 h-20 shrink-0 bg-ig-secondary rounded overflow-hidden">
                {r.post_image_url && (
                  <MediaImage src={r.post_image_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm"><span className="font-semibold">@{r.reporter_username}</span> → 게시물 #{r.post_id} (@{r.post_author_username})</p>
                <p className="text-xs text-ig-text-secondary mt-1">사유: {r.reason}</p>
                {r.details && <p className="text-xs text-ig-text-secondary mt-1">{r.details}</p>}
                {r.post_caption && <p className="text-xs mt-2 line-clamp-2">{r.post_caption}</p>}
                <p className="text-xs text-ig-text-secondary mt-2">{formatRelativeTime(r.created_at)}</p>
                <div className="flex gap-2 mt-2">
                  <Link to={`/p/${r.post_id}`} className="text-xs text-sky-600 hover:underline">게시물 보기</Link>
                  <Button variant="secondary" size="sm" onClick={() => void handleDeletePost(r.post_id)}>게시물 삭제</Button>
                </div>
              </div>
            </article>
          ))}

          {tab === 'users' && userReports.map((r) => (
            <article key={r.id} className="bg-white border border-ig-border rounded-xl p-4">
              <p className="text-sm"><span className="font-semibold">@{r.reporter_username}</span> → @{r.reported_username}</p>
              <p className="text-xs text-ig-text-secondary mt-1">사유: {r.reason}</p>
              {r.details && <p className="text-xs text-ig-text-secondary mt-1">{r.details}</p>}
              <p className="text-xs text-ig-text-secondary mt-2">{formatRelativeTime(r.created_at)}</p>
              <div className="flex gap-2 mt-2">
                <Link to={`/profile/${r.reported_username}`} className="text-xs text-sky-600 hover:underline">프로필 보기</Link>
                <Button variant="secondary" size="sm" onClick={() => void handleDeactivateUser(r.reported_user_id, r.reported_username)}>
                  계정 비활성화
                </Button>
              </div>
            </article>
          ))}

          {tab === 'reels' && reelReports.map((r) => (
            <article key={r.id} className="bg-white border border-ig-border rounded-xl p-4">
              <p className="text-sm"><span className="font-semibold">@{r.reporter_username}</span> → 릴스 #{r.reel_id} (@{r.reel_author_username})</p>
              <p className="text-xs text-ig-text-secondary mt-1">사유: {r.reason}</p>
              {r.details && <p className="text-xs text-ig-text-secondary mt-1">{r.details}</p>}
              {r.reel_caption && <p className="text-xs mt-2 line-clamp-2">{r.reel_caption}</p>}
              <p className="text-xs text-ig-text-secondary mt-2">{formatRelativeTime(r.created_at)}</p>
              <div className="flex gap-2 mt-2">
                <Link to={`/reels/${r.reel_id}`} className="text-xs text-sky-600 hover:underline">릴스 보기</Link>
                <Button variant="secondary" size="sm" onClick={() => void handleDeleteReel(r.reel_id)}>릴스 삭제</Button>
              </div>
            </article>
          ))}

          {total === 0 && <p className="text-sm text-ig-text-secondary text-center py-12">신고 내역이 없습니다.</p>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</Button>
          <span className="text-sm self-center">{page} / {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>다음</Button>
        </div>
      )}
    </div>
  );
}
