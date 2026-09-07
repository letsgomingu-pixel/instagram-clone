import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import * as usersApi from '@/api/users';
import type { User } from '@/types';
import { cn } from '@/utils/cn';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Profile whose followers/following we're listing (not necessarily the viewer). */
  username: string;
  mode: 'followers' | 'following';
}

export function FollowListModal({ isOpen, onClose, username, mode }: FollowListModalProps) {
  const { user: currentUser } = useAuth();
  const { followUser, unfollowUser } = useApp();
  const [items, setItems] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  const fetchPage = mode === 'followers' ? usersApi.getFollowers : usersApi.getFollowing;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    fetchPage(username, 1)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setPage(1);
        setHasMore(data.next_page !== null);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, username, mode, fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    fetchPage(username, nextPage)
      .then((data) => {
        setItems((prev) => [...prev, ...data.items]);
        setPage(nextPage);
        setHasMore(data.next_page !== null);
      })
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, page, username, fetchPage]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loadingMore);

  const handleToggleFollow = (target: User) => {
    if (busyIds.has(target.id)) return;
    const next = !target.is_following;
    setBusyIds((prev) => new Set(prev).add(target.id));
    setItems((prev) => prev.map((u) => (u.id === target.id ? { ...u, is_following: next } : u)));
    const action = next ? followUser(target.id) : unfollowUser(target.id);
    action
      .catch(() => {
        setItems((prev) => prev.map((u) => (u.id === target.id ? { ...u, is_following: !next } : u)));
        toast.error(next ? '팔로우에 실패했습니다.' : '팔로우 취소에 실패했습니다.');
      })
      .finally(() => {
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(target.id);
          return next;
        });
      });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" className="w-full max-h-[75vh] flex flex-col">
      <div className="px-4 py-3 border-b border-ig-border text-center shrink-0">
        <h2 className="text-sm font-semibold">{mode === 'followers' ? '팔로워' : '팔로잉'}</h2>
      </div>
      <div className="overflow-y-auto flex-1 min-h-[200px]">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-ig-text-secondary text-center py-10">
            {mode === 'followers' ? '아직 팔로워가 없습니다.' : '아직 팔로우하는 계정이 없습니다.'}
          </p>
        ) : (
          <>
            {items.map((item) => {
              const isSelf = currentUser?.id === item.id;
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Link to={`/profile/${item.username}`} onClick={onClose} className="shrink-0">
                    <Avatar src={item.avatar_url} alt={item.username} size="md" />
                  </Link>
                  <Link to={`/profile/${item.username}`} onClick={onClose} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.username}</p>
                    <p className="text-xs text-ig-text-secondary truncate">{item.full_name}</p>
                  </Link>
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(item)}
                      className={cn(
                        'h-8 px-4 text-[13px] font-semibold rounded-lg transition-colors shrink-0',
                        item.is_following
                          ? 'bg-ig-secondary text-ig-text hover:bg-[#dbdbdb]'
                          : 'bg-ig-primary text-white hover:bg-ig-primary-hover',
                      )}
                    >
                      {item.is_following ? '팔로잉' : '팔로우'}
                    </button>
                  )}
                </div>
              );
            })}
            {hasMore && <div ref={sentinelRef} className="h-4" />}
          </>
        )}
      </div>
    </Modal>
  );
}
