import { useEffect, useState } from 'react';
import type { Order } from '@/api/orders';

function formatClock(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(iso));
}

function remainingMinutes(iso: string, now: number) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60000));
}

export function PickupReadyCard({ order }: { order: Order }) {
  const readyAt =
    order.fulfillment_type === 'pickup' && order.pickup_ready_at && order.pickup_ready_minutes
      ? order.pickup_ready_at
      : null;
  const counting = Boolean(readyAt) && order.status === 'preparing';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!counting || !readyAt) return;
    const target = new Date(readyAt).getTime();
    if (!Number.isFinite(target) || target <= Date.now()) return;

    const id = window.setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= target) window.clearInterval(id);
    }, 1000);

    return () => window.clearInterval(id);
  }, [counting, readyAt]);

  if (order.fulfillment_type !== 'pickup') return null;

  if (!readyAt || order.status === 'delivered') {
    if (order.status === 'pending' || order.status === 'paid') {
      return (
        <div className="rounded-lg border border-ig-border bg-ig-secondary px-4 py-3 text-sm">
          판매자가 주문을 접수하면 포장 완료 시간이 여기에 표시됩니다.
        </div>
      );
    }
    return null;
  }

  const left = remainingMinutes(readyAt, now);
  const clock = formatClock(readyAt);
  const ready = order.status === 'ready' || left === 0;

  return (
    <div className="rounded-lg border border-ig-primary/30 bg-ig-primary/5 px-4 py-4">
      <p className="text-xs font-semibold text-ig-primary">{order.status === 'ready' ? '포장 완료' : '포장 완료 예정'}</p>
      {order.status === 'ready' ? (
        <p className="mt-1 text-lg font-semibold">포장이 완료되었습니다. 가게에서 픽업할 수 있습니다.</p>
      ) : (
        <p className="mt-1 text-2xl font-semibold">{clock}</p>
      )}
      {order.status !== 'ready' && (
        <p className="mt-1 text-sm text-ig-text">
          판매자가 {order.pickup_ready_minutes}분으로 설정했습니다.
        </p>
      )}
      {order.status !== 'ready' && (
        <p className="mt-1 text-sm text-ig-text-secondary">
          {ready
            ? '예정 시간이 지났습니다. 가게에서 픽업할 수 있습니다.'
            : `약 ${left}분 후에 가게에서 픽업할 수 있습니다.`}
        </p>
      )}
    </div>
  );
}
