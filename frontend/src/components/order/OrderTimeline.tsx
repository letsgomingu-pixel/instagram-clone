import toast from 'react-hot-toast';
import type { Order } from '@/api/orders';

const STEPS = [
  { key: 'paid', label: '결제 완료' },
  { key: 'preparing', label: '상품 준비' },
  { key: 'shipped', label: '배송 중' },
  { key: 'delivered', label: '배송 완료' },
] as const;

const STATUS_ORDER = ['pending', 'paid', 'preparing', 'shipped', 'delivered'];

function stepIndex(status: string): number {
  if (status === 'pending' || status === 'failed' || status === 'cancelled') return -1;
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 1 ? idx - 1 : -1;
}

function timestampForStep(order: Order, stepKey: string): string | null {
  if (stepKey === 'paid') return order.paid_at ?? null;
  if (stepKey === 'shipped') return order.shipped_at ?? null;
  if (stepKey === 'delivered') return order.delivered_at ?? null;
  if (stepKey === 'preparing' && order.paid_at && ['preparing', 'shipped', 'delivered'].includes(order.status)) {
    return order.paid_at;
  }
  return null;
}

function trackingSearchUrl(trackingNumber: string) {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(trackingNumber)}`;
}

interface OrderTimelineProps {
  order: Order;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const current = stepIndex(order.status);

  if (current < 0) {
    return (
      <p className="text-sm text-ig-text-secondary">
        {order.status === 'pending' ? '결제를 기다리는 중입니다.' : '주문이 취소되었거나 결제에 실패했습니다.'}
      </p>
    );
  }

  const copyTracking = async () => {
    if (!order.tracking_number) return;
    try {
      await navigator.clipboard.writeText(order.tracking_number);
      toast.success('송장번호가 복사되었습니다.');
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-4">
      <ol className="space-y-0">
        {STEPS.map((step, index) => {
          const done = index <= current;
          const active = index === current;
          const ts = timestampForStep(order, step.key);
          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`h-3 w-3 rounded-full shrink-0 ${
                    done ? 'bg-ig-primary' : 'bg-ig-border'
                  } ${active ? 'ring-2 ring-ig-primary/30' : ''}`}
                />
                {index < STEPS.length - 1 && (
                  <span className={`w-0.5 flex-1 min-h-[28px] ${index < current ? 'bg-ig-primary' : 'bg-ig-border'}`} />
                )}
              </div>
              <div className="pb-4 min-w-0">
                <p className={`text-sm font-semibold ${done ? 'text-ig-text' : 'text-ig-text-secondary'}`}>
                  {step.label}
                </p>
                {ts && (
                  <p className="text-xs text-ig-text-secondary mt-0.5">{ts.slice(0, 16).replace('T', ' ')}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {order.tracking_number && (
        <div className="rounded-lg border border-ig-border p-3 text-sm space-y-2">
          <p className="font-semibold">송장번호</p>
          <p className="font-mono text-ig-text break-all">{order.tracking_number}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyTracking}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-ig-border hover:bg-ig-secondary"
            >
              복사
            </button>
            <a
              href={trackingSearchUrl(order.tracking_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-ig-primary text-white hover:opacity-90"
            >
              배송 조회
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
