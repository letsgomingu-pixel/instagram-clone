import toast from 'react-hot-toast';
import type { Order } from '@/api/orders';
import { carrierLabel, trackingSearchUrl } from '@/utils/carriers';

const DELIVERY_STEPS = [
  { key: 'paid', label: '결제 완료' },
  { key: 'preparing', label: '상품 준비' },
  { key: 'shipped', label: '배송 중' },
  { key: 'delivered', label: '배송 완료' },
] as const;

const PICKUP_STEPS = [
  { key: 'paid', label: '결제 완료' },
  { key: 'preparing', label: '포장 중' },
  { key: 'ready', label: '포장 완료' },
  { key: 'delivered', label: '픽업 완료' },
] as const;

const STATUS_ORDER = ['pending', 'paid', 'preparing', 'shipped', 'delivered'];

function stepIndex(status: string, pickup: boolean): number {
  if (status === 'pending' || status === 'failed' || status === 'cancelled') return -1;
  if (pickup) {
    if (status === 'paid') return 0;
    if (status === 'preparing') return 1;
    if (status === 'ready') return 2;
    if (status === 'delivered') return 3;
    return -1;
  }
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 1 ? idx - 1 : -1;
}

function timestampForStep(order: Order, stepKey: string): string | null {
  if (stepKey === 'paid') return order.paid_at ?? null;
  if (stepKey === 'ready') return order.packaged_at ?? null;
  if (stepKey === 'shipped') return order.shipped_at ?? null;
  if (stepKey === 'delivered') return order.delivered_at ?? null;
  if (stepKey === 'preparing' && order.paid_at && ['preparing', 'ready', 'shipped', 'delivered'].includes(order.status)) {
    return order.paid_at;
  }
  return null;
}

interface OrderTimelineProps {
  order: Order;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const pickup = order.fulfillment_type === 'pickup';
  const steps = pickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const current = stepIndex(order.status, pickup);

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
      toast.success('운송장번호가 복사되었습니다.');
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-4">
      <ol className="space-y-0">
        {steps.map((step, index) => {
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
                {index < steps.length - 1 && (
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

      {!pickup && order.tracking_number && (
        <div className="rounded-lg border border-ig-border p-3 text-sm space-y-2">
          {carrierLabel(order.carrier) && (
            <div>
              <p className="font-semibold">택배사</p>
              <p className="text-ig-text mt-0.5">{carrierLabel(order.carrier)}</p>
            </div>
          )}
          <p className="font-semibold">운송장번호</p>
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
              href={trackingSearchUrl(order.carrier, order.tracking_number)}
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
