import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
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
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
  failed: '결제 실패',
};

const STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'paid', label: '결제 완료' },
  { value: 'preparing', label: '준비 중' },
  { value: 'shipped', label: '배송 중' },
  { value: 'delivered', label: '배송 완료' },
];

const NEXT_STATUS: Record<string, { status: 'preparing' | 'shipped' | 'delivered'; label: string }> = {
  paid: { status: 'preparing', label: '준비 시작' },
  preparing: { status: 'shipped', label: '배송 시작' },
  shipped: { status: 'delivered', label: '배송 완료' },
};

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [trackingDrafts, setTrackingDrafts] = useState<Record<number, string>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const limit = 20;

  const load = () => {
    setLoading(true);
    getAdminOrders(page, limit, statusFilter || undefined)
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
      })
      .catch(() => toast.error('주문 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, statusFilter]);

  const handleAdvance = async (order: AdminOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdatingId(order.id);
    try {
      const payload: { status: 'preparing' | 'shipped' | 'delivered'; tracking_number?: string } = {
        status: next.status,
      };
      if (next.status === 'shipped') {
        const tracking = trackingDrafts[order.id]?.trim();
        if (tracking) payload.tracking_number = tracking;
      }
      await updateAdminOrder(order.id, payload);
      toast.success('주문 상태가 업데이트되었습니다.');
      load();
    } catch {
      toast.error('상태 변경에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveTracking = async (order: AdminOrder) => {
    setUpdatingId(order.id);
    try {
      await updateAdminOrder(order.id, {
        tracking_number: trackingDrafts[order.id]?.trim() || '',
      });
      toast.success('송장번호가 저장되었습니다.');
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

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((filter) => (
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
                  <th className="px-4 py-3 font-semibold">송장번호</th>
                  <th className="px-4 py-3 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-ig-text-secondary">
                      주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const next = NEXT_STATUS[order.status];
                    return (
                      <tr key={order.id} className="border-t border-ig-border align-top">
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
                          <p className="text-xs text-ig-text-secondary mt-1">{order.quantity}개</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatPrice(order.total_amount)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-ig-secondary">
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
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
                                저장
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-ig-text-secondary">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {next ? (
                            <Button
                              size="sm"
                              disabled={updatingId === order.id}
                              onClick={() => handleAdvance(order)}
                            >
                              {next.label}
                            </Button>
                          ) : (
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
