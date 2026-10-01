import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { Modal } from '@/components/common/Modal';
import type { Post, PostEditInput, Product } from '@/types';
import { formatNumberInput, formatNumberValue, parseNumberInput } from '@/utils/formatNumber';

const STORAGE_OPTIONS: { value: Product['storage_type']; label: string }[] = [
  { value: 'fresh', label: '신선' },
  { value: 'frozen', label: '냉동' },
  { value: 'dried', label: '건조' },
  { value: 'smoked', label: '훈제' },
];

const AVAILABILITY_OPTIONS: { value: Product['availability']; label: string }[] = [
  { value: 'year_round', label: '연중' },
  { value: 'seasonal', label: '제철' },
];

const fieldClass =
  'w-full px-3 py-2 border border-ig-border rounded-lg text-[14px] bg-white focus:border-ig-text-secondary';

interface PostEditModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PostEditInput) => Promise<void>;
}

export function PostEditModal({ post, isOpen, onClose, onSave }: PostEditModalProps) {
  const isProduct = post.post_type === 'product' && Boolean(post.product);
  const [caption, setCaption] = useState(post.caption ?? '');
  const [location, setLocation] = useState(post.location ?? '');
  const [name, setName] = useState(post.product?.name ?? '');
  const [price, setPrice] = useState(post.product ? formatNumberValue(post.product.price) : '');
  const [unit, setUnit] = useState(post.product?.unit ?? '');
  const [stock, setStock] = useState(post.product ? formatNumberValue(post.product.stock) : '');
  const [storageType, setStorageType] = useState<Product['storage_type']>(post.product?.storage_type ?? 'fresh');
  const [availability, setAvailability] = useState<Product['availability']>(post.product?.availability ?? 'year_round');
  const [seasonStart, setSeasonStart] = useState(post.product?.season_start?.slice(0, 10) ?? '');
  const [seasonEnd, setSeasonEnd] = useState(post.product?.season_end?.slice(0, 10) ?? '');
  const [isActive, setIsActive] = useState(post.product?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCaption(post.caption ?? '');
    setLocation(post.location ?? '');
    setName(post.product?.name ?? '');
    setPrice(post.product ? formatNumberValue(post.product.price) : '');
    setUnit(post.product?.unit ?? '');
    setStock(post.product ? formatNumberValue(post.product.stock) : '');
    setStorageType(post.product?.storage_type ?? 'fresh');
    setAvailability(post.product?.availability ?? 'year_round');
    setSeasonStart(post.product?.season_start?.slice(0, 10) ?? '');
    setSeasonEnd(post.product?.season_end?.slice(0, 10) ?? '');
    setIsActive(post.product?.is_active ?? true);
  }, [isOpen, post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProduct) {
      if (!name.trim()) return toast.error('상품명을 입력해주세요.');
      if (!price.trim()) return toast.error('가격을 입력해주세요.');
      if (!unit.trim()) return toast.error('단위를 입력해주세요.');
      if (availability === 'seasonal' && (!seasonStart || !seasonEnd)) {
        return toast.error('제철 상품은 제철 기간을 입력해주세요.');
      }
    }

    setSaving(true);
    try {
      await onSave({
        caption: caption.trim() || null,
        location: location.trim() || null,
        ...(isProduct
          ? {
              product: {
                name: name.trim(),
                price: parseNumberInput(price),
                unit: unit.trim(),
                stock: parseNumberInput(stock),
                is_active: isActive,
                storage_type: storageType,
                availability,
                ...(availability === 'seasonal'
                  ? { season_start: seasonStart, season_end: seasonEnd }
                  : {}),
              },
            }
          : {}),
      });
      onClose();
    } catch (error) {
      const message = isAxiosError(error) && typeof error.response?.data?.detail === 'string'
        ? error.response.data.detail
        : '게시물 수정에 실패했습니다.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="px-4 pt-4 pb-2 border-b border-ig-border">
        <h2 className="text-[16px] font-bold text-center">게시물 수정</h2>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
        {isProduct && (
          <>
            <Field label="상품명">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 200))}
                className={fieldClass}
                placeholder="예: 광어회"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="가격 (원)">
                <input
                  type="text"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(formatNumberInput(e.target.value))}
                  className={fieldClass}
                  placeholder="35,000"
                />
              </Field>
              <Field label="단위">
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value.slice(0, 50))}
                  className={fieldClass}
                  placeholder="1kg"
                />
              </Field>
            </div>
            <Field label="재고">
              <input
                type="text"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(formatNumberInput(e.target.value))}
                className={fieldClass}
              />
            </Field>
            <Field label="보관">
              <select
                value={storageType}
                onChange={(e) => setStorageType(e.target.value as Product['storage_type'])}
                className={fieldClass}
              >
                {STORAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <Field label="판매 시기">
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as Product['availability'])}
                className={fieldClass}
              >
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            {availability === 'seasonal' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="제철 시작">
                  <input
                    type="date"
                    value={seasonStart}
                    onChange={(e) => setSeasonStart(e.target.value)}
                    className={fieldClass}
                  />
                </Field>
                <Field label="제철 종료">
                  <input
                    type="date"
                    value={seasonEnd}
                    onChange={(e) => setSeasonEnd(e.target.value)}
                    className={fieldClass}
                  />
                </Field>
              </div>
            )}
            <label className="flex items-center gap-2 text-[14px] font-semibold">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              판매 중
            </label>
          </>
        )}
        <Field label="캡션">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
            rows={4}
            className={`${fieldClass} resize-none`}
            placeholder="캡션 추가..."
          />
        </Field>
        <Field label="위치">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value.slice(0, 100))}
            className={fieldClass}
            placeholder="위치 추가..."
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-[14px] font-semibold rounded-lg bg-ig-secondary hover:bg-ig-hover"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 text-[14px] font-semibold rounded-lg bg-ig-primary text-white hover:bg-ig-primary-hover disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[14px] font-semibold mb-1">{label}</label>
      {children}
    </div>
  );
}
