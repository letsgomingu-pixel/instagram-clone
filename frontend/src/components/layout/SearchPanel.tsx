import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hash, Package, Search as SearchIcon, X } from 'lucide-react';
import { LeftSlidePanel } from '@/components/layout/LeftSlidePanel';
import { Avatar } from '@/components/common/Avatar';
import { useApp } from '@/contexts/AppContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/hooks/useAuth';
import * as usersApi from '@/api/users';
import * as searchApi from '@/api/search';
import type { User } from '@/types';
import type { RecentSearchOut } from '@/types/search';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setSearchPanelOpen } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchOut[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    searchApi.getRecentSearches().then(setRecentSearches).catch(() => setRecentSearches([]));
  }, [isOpen, isAuthenticated]);

  useEffect(() => {
    if (!isOpen || debouncedQuery.length < 1 || !isAuthenticated) {
      setResults([]);
      return;
    }
    usersApi.searchUsersApi(debouncedQuery).then(setResults).catch(() => setResults([]));
  }, [debouncedQuery, isAuthenticated, isOpen]);

  const handleNavigate = (path: string) => {
    onClose();
    setSearchPanelOpen(false);
    navigate(path);
  };

  const openFullSearch = () => {
    onClose();
    setSearchPanelOpen(false);
    navigate('/search');
  };

  return (
    <LeftSlidePanel isOpen={isOpen} onClose={onClose} title="검색">
      <div className="p-4 space-y-4">
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
            className="w-full pl-10 pr-10 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-[16px] placeholder:text-ig-text-secondary outline-none"
            autoFocus
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

        {debouncedQuery.length >= 1 && results.length > 0 && (
          <div className="border border-ig-border rounded-lg overflow-hidden">
            {results.slice(0, 8).map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleNavigate(`/profile/${user.username}`)}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-ig-secondary text-left"
              >
                <Avatar src={user.avatar_url} alt={user.username} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{user.username}</p>
                  <p className="text-sm text-ig-text-secondary truncate">{user.full_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {!query && isAuthenticated && recentSearches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[16px] font-bold">최근 검색</span>
              <button
                type="button"
                onClick={() => searchApi.clearRecentSearches().then(() => setRecentSearches([]))}
                className="text-sm text-ig-primary font-semibold"
              >
                모두 지우기
              </button>
            </div>
            <div className="space-y-1">
              {recentSearches.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-2">
                  <button
                    type="button"
                    onClick={() => setQuery(item.query)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {item.search_type === 'hashtag' ? (
                      <Hash size={16} />
                    ) : item.search_type === 'product' ? (
                      <Package size={16} />
                    ) : (
                      <SearchIcon size={16} />
                    )}
                    <span className="text-sm truncate">{item.query}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="검색 기록 삭제"
                    onClick={() =>
                      searchApi.deleteRecentSearch(item.id).then(() => {
                        setRecentSearches((prev) => prev.filter((r) => r.id !== item.id));
                      })
                    }
                    className="p-1 text-ig-text-secondary hover:text-ig-text"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={openFullSearch}
          className="w-full text-sm font-semibold text-ig-primary hover:underline text-left"
        >
          상품·해시태그 검색 더보기
        </button>

        {!isAuthenticated && (
          <p className="text-sm text-ig-text-secondary">
            <Link to="/login" className="text-ig-link font-semibold hover:underline">
              로그인
            </Link>
            하면 최근 검색과 계정 검색을 이용할 수 있습니다.
          </p>
        )}
      </div>
    </LeftSlidePanel>
  );
}
