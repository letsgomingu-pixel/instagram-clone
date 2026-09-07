import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hash, Search as SearchIcon, X } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { ExploreGrid } from '@/components/explore/ExploreGrid';
import { useApp } from '@/contexts/AppContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/hooks/useAuth';
import * as usersApi from '@/api/users';
import * as searchApi from '@/api/search';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { User } from '@/types';
import type { HashtagSearchOut, RecentSearchOut } from '@/types/search';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [hashtagResults, setHashtagResults] = useState<HashtagSearchOut[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchOut[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const { requireAuth } = useRequireAuth();
  const { isAuthenticated } = useAuth();
  const { followUser, unfollowUser } = useApp();

  useEffect(() => {
    if (isAuthenticated) {
      searchApi.getRecentSearches().then(setRecentSearches).catch(() => setRecentSearches([]));
    }
  }, [isAuthenticated]);

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
      setHashtagResults([]);
      return;
    }
    usersApi.searchUsersApi(debouncedQuery).then(setResults).catch(() => setResults([]));
    if (isAuthenticated) {
      searchApi.searchHashtags(debouncedQuery).then(setHashtagResults).catch(() => setHashtagResults([]));
    }
  }, [debouncedQuery, isAuthenticated]);

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
          {hashtagResults.length > 0 && (
            <div className="border-b border-ig-border">
              {hashtagResults.map((tag) => (
                <Link
                  key={tag.name}
                  to={`/explore/tags/${tag.name}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-ig-secondary"
                >
                  <div className="w-11 h-11 rounded-full bg-ig-secondary flex items-center justify-center">
                    <Hash size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">#{tag.name}</p>
                    <p className="text-xs text-ig-text-secondary">게시물 {tag.post_count.toLocaleString()}개</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {results.length === 0 && hashtagResults.length === 0 ? (
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
                    className="text-sm font-semibold hover:underline block truncate"
                  >
                    {user.username}
                  </Link>
                  <p className="text-sm text-ig-text-secondary truncate">{user.full_name}</p>
                </div>
                <Button
                  variant={user.is_following ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => handleFollowClick(user)}
                >
                  {user.is_following ? '팔로잉' : '팔로우'}
                </Button>
              </div>
            ))
          )}
        </div>
      ) : isAuthenticated && recentSearches.length > 0 ? (
        <div className="bg-white border border-ig-border md:rounded-lg overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-2 border-b border-ig-border">
            <span className="text-sm font-semibold">최근 검색</span>
            <button
              type="button"
              onClick={() => searchApi.clearRecentSearches().then(() => setRecentSearches([]))}
              className="text-xs text-ig-primary font-semibold"
            >
              모두 지우기
            </button>
          </div>
          {recentSearches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setQuery(item.query)}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-ig-secondary text-left"
            >
              {item.search_type === 'hashtag' ? <Hash size={16} /> : <SearchIcon size={16} />}
              <span className="text-sm">{item.query}</span>
            </button>
          ))}
        </div>
      ) : null}

      {debouncedQuery.length < 1 && <ExploreGrid />}
    </div>
  );
}
