import { useCallback, useEffect, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAdminProduct, getAdminProducts, updateAdminProduct } from '@/api/admin';
import { Button } from '@/components/common/Button';
import { PostCoverMedia } from '@/components/post/PostCoverMedia';
import { Spinner } from '@/components/common/Spinner';
import { ProductInfo, formatPrice } from '@/components/post/ProductInfo';
import type { Post, Product } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { formatNumberInput, formatNumberValue, parseNumberInput } from '@/utils/formatNumber';

const STORAGE_OPTIONS: { value: Product['storage_type']; label: string }[] = [
  { value: 'fresh', label: '신선' },
  { value: 'frozen', label: '냉동' },
  { value: 'dried', label: '건조' },
];

const AVAILABILITY_OPTIONS: { value: Product['availability']; label: string }[] = [
  { value: 'year_round', label: '연중' },
  { value: 'seasonal', label: '제철' },
];

export function AdminProductsPage() {
  const { publishFeedPost } = useApp();
  const [products, setProducts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('1kg');
  const [storageType, setStorageType] = useState<Product['storage_type']>('fresh');
  const [availability, setAvailability] = useState<Product['availability']>('year_round');
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [stock, setStock] = useState('10');
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editStorageType, setEditStorageType] = useState<Product['storage_type']>('fresh');
  const [editAvailability, setEditAvailability] = useState<Product['availability']>('year_round');
  const [editSeasonStart, setEditSeasonStart] = useState('');
  const [editSeasonEnd, setEditSeasonEnd] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getAdminProducts(page, limit)
      .then((data) => {
        setProducts(data.items);
        setTotal(data.total);
      })
      .catch(() => toast.error('상품 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setFiles((prev) => [...prev, ...acceptedFiles]);
    setPreviews((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => URL.createObjectURL(file)),
    ]);
  }, []);

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    if (!rejections.length) return;
    toast.error('JPG, PNG, MP4, MOV, WebM 형식만 업로드할 수 있습니다.');
  }, []);

  const hasFiles = files.length > 0;
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/*': [],
      'video/*': [],
    },
    multiple: true,
    noClick: hasFiles,
    noKeyboard: hasFiles,
    useFsAccessApi: false,
  });

  const resetForm = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setName('');
    setPrice('');
    setUnit('1kg');
    setStorageType('fresh');
    setAvailability('year_round');
    setSeasonStart('');
    setSeasonEnd('');
    setStock('10');
    setCaption('');
    setFiles([]);
    setPreviews([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('상품명을 입력해주세요.');
    if (!price.trim() || parseNumberInput(price) < 0) return toast.error('가격을 입력해주세요.');
    if (!files.length) return toast.error('상품 사진 또는 동영상을 등록해주세요.');
    if (availability === 'seasonal' && (!seasonStart || !seasonEnd)) {
      return toast.error('제철 상품은 제철 기간을 입력해주세요.');
    }

    setSaving(true);
    try {
      const created = await createAdminProduct({
        name: name.trim(),
        price: parseNumberInput(price),
        unit: unit.trim(),
        storage_type: storageType,
        availability,
        stock: parseNumberInput(stock),
        season_start: availability === 'seasonal' ? seasonStart : undefined,
        season_end: availability === 'seasonal' ? seasonEnd : undefined,
        caption: caption.trim() || undefined,
        files,
      });
      publishFeedPost(created);
      toast.success('상품이 등록되었습니다.');
      resetForm();
      setPage(1);
      load();
    } catch {
      toast.error('상품 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (post: Post) => {
    if (!post.product) return;
    setEditingId(post.product.id);
    setEditPrice(formatNumberValue(post.product.price));
    setEditStock(formatNumberValue(post.product.stock));
    setEditStorageType(post.product.storage_type);
    setEditAvailability(post.product.availability);
    setEditSeasonStart(post.product.season_start?.slice(0, 10) ?? '');
    setEditSeasonEnd(post.product.season_end?.slice(0, 10) ?? '');
    setEditActive(post.product.is_active);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (productId: number) => {
    if (!editPrice.trim() || parseNumberInput(editPrice) < 0) return toast.error('가격을 입력해주세요.');
    if (editAvailability === 'seasonal' && (!editSeasonStart || !editSeasonEnd)) {
      return toast.error('제철 상품은 제철 기간을 입력해주세요.');
    }
    setUpdatingId(productId);
    try {
      await updateAdminProduct(productId, {
        price: parseNumberInput(editPrice),
        stock: parseNumberInput(editStock),
        is_active: editActive,
        storage_type: editStorageType,
        availability: editAvailability,
        season_start: editAvailability === 'seasonal' ? editSeasonStart : undefined,
        season_end: editAvailability === 'seasonal' ? editSeasonEnd : undefined,
      });
      toast.success('상품이 수정되었습니다.');
      setEditingId(null);
      load();
    } catch {
      toast.error('상품 수정에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">상품 관리</h1>
        <p className="text-sm text-ig-text-secondary">관리자 계정으로 수산물 상품 게시물을 등록합니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-ig-border rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold">새 상품 등록</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">상품명</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-ig-border rounded-lg bg-ig-secondary"
              placeholder="예: 광어회"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">가격 (원)</span>
            <input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(formatNumberInput(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-ig-border rounded-lg bg-ig-secondary"
              placeholder="35,000"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">단위</span>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-ig-border rounded-lg bg-ig-secondary"
              placeholder="1kg"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">재고</span>
            <input
              type="text"
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(formatNumberInput(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-ig-border rounded-lg bg-ig-secondary"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">상품 유형</span>
            <select
              value={storageType}
              onChange={(e) => setStorageType(e.target.value as Product['storage_type'])}
              className="mt-1 w-full px-3 py-2 border border-ig-border rounded-lg bg-ig-secondary"
            >
              {STORAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">판매 시기</span>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as Product['availability'])}
              className="mt-1 w-full px-3 py-2 border border-ig-border rounded-lg bg-ig-secondary"
            >
              {AVAILABILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        {availability === 'seasonal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">제철 시작</span>
              <input
                type="date"
                value={seasonStart}
                onChange={(e) => setSeasonStart(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-ig-border rounded-lg bg-ig-secondary"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">제철 종료</span>
              <input
                type="date"
                value={seasonEnd}
                onChange={(e) => setSeasonEnd(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-ig-border rounded-lg bg-ig-secondary"
              />
            </label>
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium">설명 (캡션)</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-ig-border rounded-lg bg-ig-secondary min-h-[80px] resize-none"
            placeholder="상품 설명을 입력하세요"
          />
        </label>

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm font-medium">상품 사진·동영상</span>
            {hasFiles && (
              <Button type="button" size="sm" variant="secondary" onClick={() => open()}>
                + 미디어 추가
              </Button>
            )}
          </div>
          {!hasFiles ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${
                isDragActive ? 'border-ig-primary bg-ig-secondary' : 'border-ig-border'
              }`}
            >
              <input {...getInputProps()} />
              <ImagePlus className="mx-auto mb-2 text-ig-text-secondary" size={28} />
              <p className="text-sm text-ig-text-secondary">클릭하거나 드래그하여 사진·동영상 업로드</p>
              <p className="text-xs text-ig-text-secondary mt-1">JPG, PNG, MP4, MOV, WebM</p>
            </div>
          ) : (
            <>
              <input {...getInputProps()} className="hidden" aria-hidden />
              <div className="flex flex-wrap gap-2">
                {previews.map((url, index) => (
                  <div key={url} className="relative h-20 w-20 rounded-lg overflow-hidden border border-ig-border">
                    {files[index]?.type.startsWith('video/') ? (
                      <video src={url} className="h-full w-full object-cover" muted playsInline />
                    ) : (
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(url);
                        setPreviews((prev) => prev.filter((_, i) => i !== index));
                        setFiles((prev) => prev.filter((_, i) => i !== index));
                      }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                      aria-label="미디어 삭제"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => open()}
                  className="h-20 min-w-[5rem] px-2 rounded-lg border-2 border-dashed border-ig-border flex flex-col items-center justify-center gap-1 hover:border-ig-primary hover:bg-ig-secondary"
                  aria-label="미디어 추가"
                >
                  <ImagePlus size={22} className="text-ig-text-secondary" />
                  <span className="text-xs text-ig-text-secondary">미디어 추가</span>
                </button>
              </div>
              <p className="text-xs text-ig-text-secondary mt-2">{files.length}개 파일 선택됨</p>
            </>
          )}
        </div>

        <Button type="submit" loading={saving}>상품 등록</Button>
      </form>

      <div>
        <h2 className="text-lg font-semibold mb-4">등록된 상품</h2>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-ig-text-secondary py-8 text-center">등록된 상품이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((post) => (
              <article key={post.id} className="bg-white border border-ig-border rounded-xl overflow-hidden">
                <div className="aspect-square bg-ig-secondary">
                  <PostCoverMedia
                    imageUrl={post.image_url}
                    media={post.media}
                    alt={post.product?.name || '상품'}
                    autoPlayVideo
                  />
                </div>
                {post.product && <ProductInfo product={post.product} compact />}
                <div className="px-4 py-3 space-y-3">
                  <div className="text-xs text-ig-text-secondary flex justify-between">
                    <span>#{post.id}</span>
                    <span>{post.product ? formatPrice(post.product.price) : ''}</span>
                  </div>
                  {post.product && editingId === post.product.id ? (
                    <div className="space-y-2 border-t border-ig-border pt-3">
                      <label className="block text-xs">
                        <span className="font-medium">가격 (원)</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editPrice}
                          onChange={(e) => setEditPrice(formatNumberInput(e.target.value))}
                          className="mt-1 w-full px-2 py-1.5 border border-ig-border rounded-lg bg-ig-secondary text-sm"
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="font-medium">재고</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editStock}
                          onChange={(e) => setEditStock(formatNumberInput(e.target.value))}
                          className="mt-1 w-full px-2 py-1.5 border border-ig-border rounded-lg bg-ig-secondary text-sm"
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="font-medium">상품 유형</span>
                        <select
                          value={editStorageType}
                          onChange={(e) =>
                            setEditStorageType(e.target.value as Product['storage_type'])
                          }
                          className="mt-1 w-full px-2 py-1.5 border border-ig-border rounded-lg bg-ig-secondary text-sm"
                        >
                          {STORAGE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs">
                        <span className="font-medium">판매 시기</span>
                        <select
                          value={editAvailability}
                          onChange={(e) =>
                            setEditAvailability(e.target.value as Product['availability'])
                          }
                          className="mt-1 w-full px-2 py-1.5 border border-ig-border rounded-lg bg-ig-secondary text-sm"
                        >
                          {AVAILABILITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {editAvailability === 'seasonal' && (
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-xs">
                            <span className="font-medium">제철 시작</span>
                            <input
                              type="date"
                              value={editSeasonStart}
                              onChange={(e) => setEditSeasonStart(e.target.value)}
                              className="mt-1 w-full px-2 py-1.5 border border-ig-border rounded-lg bg-ig-secondary text-sm"
                            />
                          </label>
                          <label className="block text-xs">
                            <span className="font-medium">제철 종료</span>
                            <input
                              type="date"
                              value={editSeasonEnd}
                              onChange={(e) => setEditSeasonEnd(e.target.value)}
                              className="mt-1 w-full px-2 py-1.5 border border-ig-border rounded-lg bg-ig-secondary text-sm"
                            />
                          </label>
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                        />
                        <span>판매 중 (해제 시 품절 처리)</span>
                      </label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          loading={updatingId === post.product.id}
                          onClick={() => handleUpdate(post.product!.id)}
                        >
                          저장
                        </Button>
                        <Button size="sm" variant="secondary" onClick={cancelEdit}>
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : post.product ? (
                    <Button size="sm" variant="secondary" fullWidth onClick={() => startEdit(post)}>
                      수정
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-ig-text-secondary">총 {total.toLocaleString()}개</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              이전
            </Button>
            <span className="text-xs self-center">{page} / {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              다음
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
