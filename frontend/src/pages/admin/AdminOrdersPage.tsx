import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  cancelAdminOrder,
  getAdminOrders,
  updateAdminOrder,
  type AdminOrder,
} from '@/api/admin';
import { formatPrice } from '@/components/post/ProductInfo';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';

const STATUS_LABELS: Record<string, string> = {
  pending: '결제 대기',
  paid: '결제 완료',
  preparing: '상품 준비 중',
  ready: '포장 완료',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
  failed: '결제 실패',
};

const FULFILLMENT_TABS = [
  { value: 'delivery' as const, label: '택배 주문' },
  { value: 'pickup' as const, label: '포장 주문' },
];

const DELIVERY_STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'paid', label: '결제 완료' },
  { value: 'preparing', label: '준비 중' },
  { value: 'shipped', label: '배송 중' },
  { value: 'delivered', label: '배송 완료' },
];

const PICKUP_STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'paid', label: '결제 완료' },
  { value: 'preparing', label: '포장 중' },
  { value: 'ready', label: '포장 완료' },
  { value: 'delivered', label: '픽업 완료' },
];

const NEXT_STATUS: Record<string, { status: 'preparing' | 'ready' | 'shipped' | 'delivered'; label: string }> = {
  paid: { status: 'preparing', label: '준비 시작' },
  shipped: { status: 'delivered', label: '배송 완료' },
};

const PICKUP_MINUTES = [10, 15, 20, 30, 40, 60];

function nextAction(order: AdminOrder): { status: 'preparing' | 'ready' | 'shipped' | 'delivered'; label: string } | null {
  if (order.fulfillment_type === 'pickup') {
    if (order.status === 'paid') return { status: 'preparing', label: '주문 접수' };
    if (order.status === 'preparing') return { status: 'ready', label: '포장 완료' };
    if (order.status === 'ready') return { status: 'delivered', label: '픽업 완료' };
    return null;
  }
  return NEXT_STATUS[order.status] ?? null;
}

function statusLabel(order: AdminOrder) {
  if (order.fulfillment_type === 'pickup') {
    if (order.status === 'preparing') return '포장 중';
    if (order.status === 'ready') return '포장 완료';
    if (order.status === 'delivered') return '픽업 완료';
  }
  return STATUS_LABELS[order.status] || order.status;
}

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedOrderId = Number(searchParams.get('order') || 0);
  const fulfillment = searchParams.get('fulfillment') === 'pickup' ? 'pickup' : 'delivery';
  const statusFilters = fulfillment === 'pickup' ? PICKUP_STATUS_FILTERS : DELIVERY_STATUS_FILTERS;
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [trackingDrafts, setTrackingDrafts] = useState<Record<number, string>>({});
  const [readyDrafts, setReadyDrafts] = useState<Record<number, string>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const limit = 20;

  const load = () => {
    setLoading(true);
    getAdminOrders(page, limit, statusFilter || undefined, fulfillment)
      .then((data) => {
        setOrders(data.items);
        setTotal(data.total);
        setTrackingDrafts((prev) => {
          const next = { ...prev };
          for (const order of data.items) {
            if (next[order.id] === undefined) {
              next[order.id] = order.tracking_number || '';
            }
          }
          return next;
        });
        setReadyDrafts((prev) => {
          const next = { ...prev };
          for (const order of data.items) {
            if (next[order.id] === undefined) {
              next[order.id] = String(order.pickup_ready_minutes || 20);
            }
          }
          return next;
        });
      })
      .catch(() => toast.error('주문 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, statusFilter, fulfillment]);

  const selectFulfillment = (next: 'delivery' | 'pickup') => {
    setPage(1);
    setStatusFilter('');
    const params = new URLSearchParams(searchParams);
    params.set('fulfillment', next);
    setSearchParams(params);
  };

  const pickupMinutes = (order: AdminOrder) => {
    const minutes = Number(readyDrafts[order.id] ?? 20);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 180) return null;
    return minutes;
  };

  const handleAdvance = async (order: AdminOrder) => {
    const next = nextAction(order);
    if (!next) return;
    const payload: {
      status: 'preparing' | 'ready' | 'shipped' | 'delivered';
      tracking_number?: string;
      pickup_ready_minutes?: number;
    } = { status: next.status };
    if (order.fulfillment_type === 'pickup' && next.status === 'preparing') {
      const minutes = pickupMinutes(order);
      if (minutes == null) {
        toast.error('포장 완료 시간은 5분에서 180분 사이로 입력해 주세요.');
        return;
      }
      payload.pickup_ready_minutes = minutes;
    }
    if (next.status === 'shipped') {
      const tracking = trackingDrafts[order.id]?.trim();
      if (!tracking) {
        toast.error('운송장 번호를 입력해 주세요.');
        return;
      }
      payload.tracking_number = tracking;
    }
    setUpdatingId(order.id);
    try {
      await updateAdminOrder(order.id, payload);
      toast.success(
        order.fulfillment_type === 'pickup' && next.status === 'preparing'
          ? '주문 수락 알림을 앱으로 보냈습니다.'
          : next.status === 'ready'
            ? '포장 완료 알림을 앱으로 보냈습니다.'
            : next.status === 'delivered' && order.fulfillment_type !== 'pickup'
              ? '배송 완료로 바꾸고 알림을 보냈습니다.'
              : next.status === 'shipped'
                ? '배송 중으로 바꾸고 알림을 보냈습니다.'
                : '주문 상태가 업데이트되었습니다.',
      );
      load();
    } catch {
      toast.error('상태 변경에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = async (order: AdminOrder) => {
    if (!window.confirm(`주문 #${order.id}을(를) 취소/환불 처리하시겠습니까?`)) return;
    setUpdatingId(order.id);
    try {
      await cancelAdminOrder(order.id);
      toast.success('주문이 취소되었습니다.');
      load();
    } catch {
      toast.error('주문 취소에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveReady = async (order: AdminOrder) => {
    const minutes = pickupMinutes(order);
    if (minutes == null) {
      toast.error('포장 완료 시간은 5분에서 180분 사이로 입력해 주세요.');
      return;
    }
    setUpdatingId(order.id);
    try {
      await updateAdminOrder(order.id, { pickup_ready_minutes: minutes });
      toast.success(`포장 완료 시간을 ${minutes}분으로 저장했습니다.`);
      load();
    } catch {
      toast.error('포장 시간 저장에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveTracking = async (order: AdminOrder) => {
    const tracking = trackingDrafts[order.id]?.trim() || '';
    if (order.fulfillment_type !== 'pickup' && order.status === 'preparing' && !tracking) {
      toast.error('운송장 번호를 입력해 주세요.');
      return;
    }
    setUpdatingId(order.id);
    try {
      const updated = await updateAdminOrder(order.id, { tracking_number: tracking });
      toast.success(
        order.status === 'preparing' && updated.status === 'shipped'
          ? '배송 중으로 바꾸고 알림을 보냈습니다.'
          : '송장번호가 저장되었습니다.',
      );
      load();
    } catch {
      toast.error('송장번호 저장에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">주문 관리</h1>

      <div className="flex gap-2 mb-4">
        {FULFILLMENT_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => selectFulfillment(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              fulfillment === tab.value
                ? 'bg-ig-primary text-white border-ig-primary'
                : 'bg-white border-ig-border text-ig-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => {
              setPage(1);
              setStatusFilter(filter.value);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              statusFilter === filter.value
                ? 'bg-ig-primary text-white border-ig-primary'
                : 'bg-white border-ig-border text-ig-text'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="bg-white border border-ig-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ig-secondary text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">주문</th>
                  <th className="px-4 py-3 font-semibold">구매자</th>
                  <th className="px-4 py-3 font-semibold">상품</th>
                  <th className="px-4 py-3 font-semibold">금액</th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  {fulfillment === 'delivery' ? (
                    <th className="px-4 py-3 font-semibold">송장번호</th>
                  ) : null}
                  <th className="px-4 py-3 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={fulfillment === 'pickup' ? 6 : 7} className="px-4 py-12 text-center text-ig-text-secondary">
                      {fulfillment === 'pickup' ? '포장 주문이 없습니다.' : '택배 주문이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const next = nextAction(order);
                    const isPickup = order.fulfillment_type === 'pickup';
                    return (
                      <tr
                        key={order.id}
                        className={`border-t border-ig-border align-top ${
                          highlightedOrderId === order.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium">#{order.id}</p>
                          <p className="text-xs text-ig-text-secondary mt-1">
                            {order.created_at.slice(0, 10)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">@{order.username}</p>
                          <p className="text-xs text-ig-text-secondary mt-1">{order.shipping_name}</p>
                          <p className="text-xs text-ig-text-secondary">{order.phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p>{order.product?.name || `상품 #${order.product_id}`}</p>
                          <p className="text-xs text-ig-text-secondary mt-1">
                            {order.quantity}개{isPickup ? ' · 포장' : ' · 배송'}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatPrice(order.total_amount)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-ig-secondary">
                            {statusLabel(order)}
                          </span>
                          {isPickup && order.pickup_ready_minutes ? (
                            <p className="text-xs text-ig-primary mt-1">포장 {order.pickup_ready_minutes}분</p>
                          ) : null}
                        </td>
                        {fulfillment === 'delivery' ? (
                        <td className="px-4 py-3 min-w-[180px]">
                          {['preparing', 'shipped', 'delivered'].includes(order.status) ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={trackingDrafts[order.id] ?? ''}
                                onChange={(e) =>
                                  setTrackingDrafts((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.value,
                                  }))
                                }
                                placeholder="송장번호"
                                className="flex-1 min-w-0 border border-ig-border rounded px-2 py-1 text-xs"
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={updatingId === order.id}
                                onClick={() => handleSaveTracking(order)}
                              >
                                {order.status === 'preparing' ? '배송 시작' : '저장'}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-ig-text-secondary">-</span>
                          )}
                        </td>
                        ) : null}
                        <td className="px-4 py-3 space-y-2 min-w-[200px]">
                          {isPickup && (order.status === 'paid' || order.status === 'preparing') ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold">포장 완료까지</p>
                              <div className="flex flex-wrap gap-1">
                                {PICKUP_MINUTES.map((minutes) => (
                                  <button
                                    key={minutes}
                                    type="button"
                                    onClick={() =>
                                      setReadyDrafts((prev) => ({ ...prev, [order.id]: String(minutes) }))
                                    }
                                    className={`px-2 py-1 rounded text-xs border ${
                                      Number(readyDrafts[order.id]) === minutes
                                        ? 'bg-ig-primary text-white border-ig-primary'
                                        : 'border-ig-border'
                                    }`}
                                  >
                                    {minutes}분
                                  </button>
                                ))}
                              </div>
                              <input
                                type="number"
                                min={5}
                                max={180}
                                value={readyDrafts[order.id] ?? '20'}
                                onChange={(e) =>
                                  setReadyDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))
                                }
                                className="w-24 border border-ig-border rounded px-2 py-1 text-xs"
                                aria-label="포장 완료까지 분"
                              />
                              {order.status === 'preparing' ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={updatingId === order.id}
                                  onClick={() => handleSaveReady(order)}
                                >
                                  시간 변경
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                          {next ? (
                            <Button
                              size="sm"
                              disabled={updatingId === order.id}
                              onClick={() => handleAdvance(order)}
                            >
                              {next.label}
                            </Button>
                          ) : null}
                          {['pending', 'paid', 'preparing', 'ready'].includes(order.status) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={updatingId === order.id}
                              onClick={() => handleCancel(order)}
                            >
                              취소/환불
                            </Button>
                          )}
                          {!next && !['pending', 'paid', 'preparing', 'ready'].includes(order.status) && (
                            <span className="text-xs text-ig-text-secondary">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-ig-border">
            <p className="text-xs text-ig-text-secondary">총 {total.toLocaleString()}건</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                이전
              </Button>
              <span className="text-xs self-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
