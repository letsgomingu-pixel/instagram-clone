import { Link } from 'react-router-dom';
import type { Product } from '@/types';

const STORAGE_LABELS: Record<Product['storage_type'], string> = {
  fresh: '신선',
  frozen: '냉동',
  dried: '건조',
  smoked: '훈제',
};

const AVAILABILITY_LABELS: Record<Product['availability'], string> = {
  year_round: '연중',
  seasonal: '제철',
};

interface ProductInfoProps {
  product: Product;
  compact?: boolean;
  productPostId?: number;
  showBuyButton?: boolean;
}

export function formatPrice(price: number) {
  return `${price.toLocaleString('ko-KR')}원`;
}

export function ProductInfo({
  product,
  compact = false,
  showBuyButton = false,
}: ProductInfoProps) {
  const badges = [
    STORAGE_LABELS[product.storage_type],
    AVAILABILITY_LABELS[product.availability],
  ];

  if (!product.is_in_season) badges.push('비제철');
  if (!product.is_available) badges.push('품절');

  return (
    <div className={compact ? 'px-3 py-2 border-t border-ig-border bg-[#fafafa]' : 'px-4 py-3 border-t border-ig-border bg-[#fafafa]'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold truncate">{product.name}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {badges.map((badge) => (
              <span
                key={badge}
                className="text-[10px] px-1.5 py-0.5 rounded bg-ig-secondary text-ig-text-secondary font-medium"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[16px] font-bold text-ig-primary">{formatPrice(product.price)}</p>
          <p className="text-[11px] text-ig-text-secondary">/ {product.unit}</p>
        </div>
      </div>
      {!compact && product.availability === 'seasonal' && product.season_start && product.season_end && (
        <p className="text-[11px] text-ig-text-secondary mt-2">
          제철: {product.season_start} ~ {product.season_end}
        </p>
      )}

      {showBuyButton && (
        <div className="mt-3">
          {product.is_available ? (
            <Link
              to={`/checkout/${product.id}`}
              className="block w-full text-center py-2.5 rounded-lg bg-ig-primary text-white text-sm font-semibold hover:opacity-90"
            >
              구매하기
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="block w-full text-center py-2.5 rounded-lg bg-ig-secondary text-ig-text-secondary text-sm font-semibold cursor-not-allowed"
            >
              구매 불가
            </button>
          )}
        </div>
      )}
    </div>
  );
}
