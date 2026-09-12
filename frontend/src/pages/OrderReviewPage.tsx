import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as ordersApi from '@/api/orders';
import { createReview } from '@/api/posts';
import { ProductInfo } from '@/components/post/ProductInfo';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { useApp } from '@/contexts/AppContext';

export function OrderReviewPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { publishFeedPost } = useApp();
  const [order, setOrder] = useState<ordersApi.Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!orderId) return;
    ordersApi
      .getOrder(Number(orderId))
      .then((data) => {
        if (!data.can_review) {
          toast.error('리뷰를 작성할 수 없는 주문입니다.');
          navigate(`/orders/${orderId}`, { replace: true });
          return;
        }
        setOrder(data);
      })
      .catch(() => {
        toast.error('주문 정보를 불러오지 못했습니다.');
        navigate('/orders', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [orderId, navigate]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setFiles((prev) => [...prev, ...acceptedFiles]);
    setPreviews((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => URL.createObjectURL(file)),
    ]);
  }, []);

  const hasFiles = files.length > 0;
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
    },
    multiple: true,
    noClick: hasFiles,
    noKeyboard: hasFiles,
  });

  const removeFile = (index: number) => {
    setPreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || files.length === 0) {
      toast.error('사진을 1장 이상 첨부해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const post = await createReview({
        order_id: order.id,
        rating,
        caption: caption.trim() || undefined,
        files,
      });
      publishFeedPost(post);
      toast.success('리뷰가 등록되었습니다.');
      navigate('/', { replace: true });
    } catch {
      toast.error('리뷰 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto">
      <div className="feed-card p-6">
        <h1 className="text-xl font-semibold mb-2">리뷰 작성</h1>
        <p className="text-sm text-ig-text-secondary mb-6">주문 #{order.id}</p>

        {order.product && <ProductInfo product={order.product} compact />}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2">별점</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`text-2xl ${value <= rating ? 'text-yellow-500' : 'text-ig-border'}`}
                  aria-label={`${value}점`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="review-caption" className="block text-sm font-semibold mb-2">
              리뷰 내용
            </label>
            <textarea
              id="review-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              maxLength={2200}
              placeholder="상품은 어떠셨나요?"
              className="w-full border border-ig-border rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          <div>
            <span className="block text-sm font-semibold mb-2">사진</span>
            {!hasFiles ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${
                  isDragActive ? 'border-ig-primary bg-ig-secondary' : 'border-ig-border'
                }`}
              >
                <input {...getInputProps()} />
                <ImagePlus className="mx-auto mb-2 text-ig-text-secondary" size={28} />
                <p className="text-sm text-ig-text-secondary">
                  클릭하거나 드래그하여 사진·동영상 업로드
                </p>
              </div>
            ) : (
              <>
                <input {...getInputProps()} className="hidden" aria-hidden />
                <div className="flex flex-wrap gap-2">
                  {previews.map((url, index) => (
                    <div
                      key={url}
                      className="relative h-20 w-20 rounded-lg overflow-hidden border border-ig-border"
                    >
                      {files[index]?.type.startsWith('video/') ? (
                        <video src={url} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                        aria-label="사진 삭제"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => open()}
                    className="h-20 min-w-[5rem] px-2 rounded-lg border-2 border-dashed border-ig-border flex flex-col items-center justify-center gap-1 hover:border-ig-primary hover:bg-ig-secondary"
                    aria-label="사진 추가"
                  >
                    <ImagePlus size={22} className="text-ig-text-secondary" />
                    <span className="text-xs text-ig-text-secondary">사진 추가</span>
                  </button>
                </div>
                <p className="text-xs text-ig-text-secondary mt-2">{files.length}개 파일 선택됨</p>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? '등록 중…' : '리뷰 등록'}
            </Button>
            <Link
              to={`/orders/${order.id}`}
              className="flex-1 text-center py-2 text-sm border border-ig-border rounded-lg hover:bg-ig-secondary"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
