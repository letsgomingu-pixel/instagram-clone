import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search as SearchIcon, X } from 'lucide-react';
import { PostCoverMedia } from '@/components/post/PostCoverMedia';
import { ExploreGrid } from '@/components/explore/ExploreGrid';
import { TabBar } from '@/components/post/FeedTabs';
import { formatPrice } from '@/components/post/ProductInfo';
import { useDebounce } from '@/hooks/useDebounce';
import * as searchApi from '@/api/search';
import type { Product } from '@/types';
import type { ProductSearchOut } from '@/types/search';

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

function ProductSearchGrid({ products }: { products: ProductSearchOut[] }) {
  return (
    <div className="grid grid-cols-3 gap-[2px] md:gap-1 max-w-[935px]">
      {products.map((product, index) => {
        const isLarge = index % 10 === 0 || index % 10 === 5;

        return (
          <Link
            key={product.id}
            to={product.is_available ? `/checkout/${product.id}` : `/p/${product.post_id}`}
            className={`relative group overflow-hidden bg-ig-secondary ${
              isLarge ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
            }`}
          >
            {product.image_url ? (
              <PostCoverMedia imageUrl={product.image_url} alt={product.name} />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package size={24} className="text-ig-text-secondary" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
              <p className="text-xs font-semibold text-white truncate">{product.name}</p>
              <p className="text-[11px] text-white/80">
                {formatPrice(product.price)} / {product.unit}
                {!product.is_available && ' · 품절'}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<FilterGroup>('storage');
  const [storageFilter, setStorageFilter] = useState<Product['storage_type'] | ''>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<Product['availability'] | ''>('');
  const [productResults, setProductResults] = useState<ProductSearchOut[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const hasSearchInput =
    debouncedQuery.length >= 1 || storageFilter || availabilityFilter;

  useEffect(() => {
    if (!hasSearchInput) {
      setProductResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchApi
      .searchProducts({
        q: debouncedQuery.length >= 1 ? debouncedQuery : undefined,
        storage_type: storageFilter || undefined,
        availability: availabilityFilter || undefined,
      })
      .then(setProductResults)
      .catch(() => setProductResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery, storageFilter, availabilityFilter, hasSearchInput]);

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
              { id: 'storage', label: '상품 유형' },
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
        loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
          </div>
        ) : productResults.length > 0 ? (
          <ProductSearchGrid products={productResults} />
        ) : (
          <p className="text-sm text-ig-text-secondary text-center py-8">검색 결과가 없습니다.</p>
        )
      ) : (
        <ExploreGrid />
      )}
    </div>
  );
}
