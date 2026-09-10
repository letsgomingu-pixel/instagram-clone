import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hash, Package, Search as SearchIcon, X } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { MediaImage } from '@/components/common/MediaImage';
import { ExploreGrid } from '@/components/explore/ExploreGrid';
import { TabBar } from '@/components/post/FeedTabs';
import { formatPrice } from '@/components/post/ProductInfo';
import { useApp } from '@/contexts/AppContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/hooks/useAuth';
import * as usersApi from '@/api/users';
import * as searchApi from '@/api/search';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Product, User } from '@/types';
import type { HashtagSearchOut, ProductSearchOut, RecentSearchOut } from '@/types/search';

const STORAGE_FILTERS: { value: Product['storage_type'] | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'fresh', label: '신선' },
  { value: 'frozen', label: '냉동' },
  { value: 'dried', label: '건조' },
];

const AVAILABILITY_FILTERS: { value: Product['availability'] | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'year_round', label: '연중' },
  { value: 'seasonal', label: '제철' },
];

type FilterGroup = 'storage' | 'availability';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<FilterGroup>('storage');
  const [storageFilter, setStorageFilter] = useState<Product['storage_type'] | ''>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<Product['availability'] | ''>('');
  const [results, setResults] = useState<User[]>([]);
  const [productResults, setProductResults] = useState<ProductSearchOut[]>([]);
  const [hashtagResults, setHashtagResults] = useState<HashtagSearchOut[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchOut[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const { requireAuth } = useRequireAuth();
  const { isAuthenticated } = useAuth();
  const { followUser, unfollowUser } = useApp();

  const hasSearchInput =
    debouncedQuery.length >= 1 || storageFilter || availabilityFilter;

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
    if (!hasSearchInput) {
      setResults([]);
      setProductResults([]);
      setHashtagResults([]);
      return;
    }

    if (debouncedQuery.length >= 1 && isAuthenticated) {
      usersApi.searchUsersApi(debouncedQuery).then(setResults).catch(() => setResults([]));
      searchApi.searchHashtags(debouncedQuery).then(setHashtagResults).catch(() => setHashtagResults([]));
    } else {
      setResults([]);
      setHashtagResults([]);
    }

    searchApi
      .searchProducts({
        q: debouncedQuery.length >= 1 ? debouncedQuery : undefined,
        storage_type: storageFilter || undefined,
        availability: availabilityFilter || undefined,
      })
      .then(setProductResults)
      .catch(() => setProductResults([]));
  }, [debouncedQuery, storageFilter, availabilityFilter, hasSearchInput, isAuthenticated]);

  return (
    <div className="md:pt-0">
      <div className="sticky mobile-sticky-below-header md:top-8 bg-ig-bg z-10 pb-2 md:pb-4 pt-2 space-y-3">
        <div className="relative">
          <SearchIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ig-text-secondary"
          />
          <input
            type="text"
            placeholder="상품 검색"
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

        <div className="feed-card mb-3">
          <TabBar
            tabs={[
              { id: 'storage', label: '보관' },
              { id: 'availability', label: '제철' },
            ]}
            activeTab={filterGroup}
            onChange={setFilterGroup}
          />
          {filterGroup === 'storage' ? (
            <TabBar
              tabs={STORAGE_FILTERS.map((opt) => ({
                id: opt.value || 'all',
                label: opt.label,
              }))}
              activeTab={storageFilter || 'all'}
              onChange={(id) => setStorageFilter(id === 'all' ? '' : (id as Product['storage_type']))}
              bordered={false}
            />
          ) : (
            <TabBar
              tabs={AVAILABILITY_FILTERS.map((opt) => ({
                id: opt.value || 'all',
                label: opt.label,
              }))}
              activeTab={availabilityFilter || 'all'}
              onChange={(id) =>
                setAvailabilityFilter(id === 'all' ? '' : (id as Product['availability']))
              }
              bordered={false}
            />
          )}
        </div>
      </div>

      {hasSearchInput ? (
        <div className="bg-white border border-ig-border md:rounded-lg overflow-hidden">
          {!isAuthenticated && debouncedQuery.length >= 1 && (
            <div className="px-4 py-3 border-b border-ig-border bg-ig-secondary text-sm text-ig-text-secondary">
              계정·해시태그 검색은{' '}
              <Link to="/login" className="text-ig-link font-semibold hover:underline">
                로그인
              </Link>
              이 필요합니다. 상품 검색은 로그인 없이 이용할 수 있습니다.
            </div>
          )}
          {productResults.length > 0 && (
            <div className="border-b border-ig-border">
              <p className="px-4 py-2 text-xs font-semibold text-ig-text-secondary bg-ig-secondary">상품</p>
              {productResults.map((product) => (
                <Link
                  key={product.id}
                  to={product.is_available ? `/checkout/${product.id}` : `/p/${product.post_id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-ig-secondary"
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-ig-secondary shrink-0">
                    {product.image_url ? (
                      <MediaImage src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={18} className="text-ig-text-secondary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{product.name}</p>
                    <p className="text-xs text-ig-text-secondary">
                      {formatPrice(product.price)} / {product.unit}
                      {!product.is_available && ' · 품절'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
          {results.map((user) => (
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
          ))}
          {productResults.length === 0 && results.length === 0 && hashtagResults.length === 0 && (
            <p className="text-sm text-ig-text-secondary text-center py-8">검색 결과가 없습니다.</p>
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
            <div key={item.id} className="flex items-center gap-2 px-4 py-3 hover:bg-ig-secondary">
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
                onClick={(e) => {
                  e.stopPropagation();
                  searchApi.deleteRecentSearch(item.id).then(() => {
                    setRecentSearches((prev) => prev.filter((r) => r.id !== item.id));
                  });
                }}
                className="p-1 text-ig-text-secondary hover:text-ig-text shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {!hasSearchInput && <ExploreGrid />}
    </div>
  );
}
