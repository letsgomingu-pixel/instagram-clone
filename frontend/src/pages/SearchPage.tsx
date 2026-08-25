import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { ExploreGrid } from '@/components/explore/ExploreGrid';
import { useApp } from '@/contexts/AppContext';
import { useDebounce } from '@/hooks/useDebounce';
import * as usersApi from '@/api/users';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { User } from '@/types';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const { requireAuth } = useRequireAuth();
  const { followUser, unfollowUser } = useApp();

  const handleFollowClick = (user: User) => {
    requireAuth(async () => {
      if (user.is_following) await unfollowUser(user.id);
      else await followUser(user.id);
      setResults((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_following: !u.is_following } : u)),
      );
    });
  };

  useEffect(() => {
    if (debouncedQuery.length < 1) {
      setResults([]);
      return;
    }
    usersApi.searchUsersApi(debouncedQuery).then(setResults).catch(() => setResults([]));
  }, [debouncedQuery]);

  return (
    <div className="md:pt-0">
      <div className="sticky mobile-sticky-below-header md:top-8 bg-ig-bg z-10 pb-2 md:pb-4 pt-2">
        <div className="relative">
          <SearchIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ig-text-secondary"
          />
          <input
            type="text"
            placeholder="검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-[16px] placeholder:text-ig-text-secondary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="검색어 지우기"
            >
              <X size={16} className="text-ig-text-secondary" />
            </button>
          )}
        </div>
      </div>

      {debouncedQuery.length >= 1 ? (
        <div className="bg-white border border-ig-border md:rounded-lg overflow-hidden">
          {results.length === 0 ? (
            <p className="text-sm text-ig-text-secondary text-center py-8">검색 결과가 없습니다.</p>
          ) : (
            results.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-ig-secondary transition-colors"
              >
                <Link to={`/profile/${user.username}`}>
                  <Avatar src={user.avatar_url} alt={user.username} size="md" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${user.username}`}
                    className="text-sm font-semibold block truncate hover:underline"
                  >
                    {user.username}
                  </Link>
                  <span className="text-sm text-ig-text-secondary truncate block">{user.full_name}</span>
                </div>
                {!user.is_own_profile && (
                  <Button
                    variant={user.is_following ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => handleFollowClick(user)}
                  >
                    {user.is_following ? '팔로잉' : '팔로우'}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <ExploreGrid />
      )}
    </div>
  );
}
