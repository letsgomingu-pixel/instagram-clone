import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { OrderTimeline } from '@/components/order/OrderTimeline';
import { ProductInfo, formatPrice } from '@/components/post/ProductInfo';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import * as ordersApi from '@/api/orders';

const STATUS_LABELS: Record<string, string> = {
  pending: '결제 대기',
  paid: '결제 완료',
  preparing: '상품 준비 중',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
  failed: '결제 실패',
};

function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className="text-xs font-semibold px-2 py-1 rounded bg-ig-secondary text-ig-text">
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<ordersApi.Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi
      .getMyOrders()
      .then((data) => setOrders(data.items))
      .catch(() => toast.error('주문 내역을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto">
      <div className="feed-card p-6">
        <h1 className="text-xl font-semibold mb-6">내 주문</h1>
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-ig-text-secondary mb-4">주문 내역이 없습니다.</p>
            <Link to="/" className="text-sm text-ig-primary font-semibold hover:underline">
              상품 둘러보기
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ig-border">
            {orders.map((order) => (
              <li key={order.id} className="py-4">
                <Link to={`/orders/${order.id}`} className="block hover:opacity-80">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{order.product?.name || `상품 #${order.product_id}`}</p>
                      <p className="text-xs text-ig-text-secondary mt-1">
                        {order.quantity}개 · {formatPrice(order.total_amount)}
                      </p>
                      <p className="text-xs text-ig-text-secondary mt-1">{order.created_at.slice(0, 10)}</p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ordersApi.Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    setError(false);
    ordersApi
      .getOrder(Number(orderId))
      .then(setOrder)
      .catch(() => {
        setError(true);
        toast.error('주문 정보를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const canCancel = order && (order.status === 'pending' || order.status === 'paid');

  const handleCancel = async () => {
    if (!order || !canCancel) return;
    if (!window.confirm('주문을 취소하시겠습니까?')) return;
    setCancelling(true);
    try {
      const updated = await ordersApi.cancelOrder(order.id);
      setOrder(updated);
      toast.success('주문이 취소되었습니다.');
    } catch {
      toast.error('주문 취소에 실패했습니다.');
    } finally {
      setCancelling(false);
    }
  };

  if (error || !order) {
    return (
      <div className="max-w-[560px] mx-auto feed-card p-8 text-center space-y-4">
        <p className="text-sm text-ig-text-secondary">주문을 찾을 수 없습니다.</p>
        <Button variant="secondary" onClick={() => navigate('/orders')}>
          주문 목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto space-y-4">
      <div className="feed-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">주문 #{order.id}</h1>
          <OrderStatusBadge status={order.status} />
        </div>

        {(order.items && order.items.length > 0 ? order.items : order.product ? [{ product: order.product, quantity: order.quantity, subtotal: order.subtotal }] : []).map((item, index) => (
          item.product ? (
            <div key={index} className={index > 0 ? 'mt-3 pt-3 border-t border-ig-border' : ''}>
              <ProductInfo product={item.product} compact />
              <p className="text-xs text-ig-text-secondary mt-1 px-3">{item.quantity}개 · {formatPrice(item.subtotal)}</p>
            </div>
          ) : null
        ))}

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ig-text-secondary">상품 금액</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ig-text-secondary">배송비</span>
            <span>{formatPrice(order.shipping_fee)}</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t border-ig-border">
            <span>결제 금액</span>
            <span className="text-ig-primary">{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      </div>

      <div className="feed-card p-6">
        <h2 className="font-semibold mb-4 text-sm">배송 현황</h2>
        <OrderTimeline order={order} />
      </div>

      <div className="feed-card p-6 text-sm space-y-2">
        <h2 className="font-semibold mb-2">배송지</h2>
        <p>{order.shipping_name}</p>
        <p>{order.phone}</p>
        <p>
          [{order.postcode}] {order.address_line1} {order.address_line2}
        </p>
      </div>

      {canCancel && (
        <Button variant="secondary" fullWidth loading={cancelling} onClick={handleCancel}>
          주문 취소
        </Button>
      )}

      {order.can_review && (
        <Link
          to={`/orders/${order.id}/review`}
          className="feed-card p-4 block text-center text-sm font-semibold text-white bg-ig-primary rounded-xl hover:opacity-90"
        >
          리뷰 작성하기
        </Link>
      )}

      {order.review_post_id && (
        <Link
          to={`/p/${order.review_post_id}`}
          className="feed-card p-4 block text-center text-sm font-semibold text-ig-primary hover:underline"
        >
          작성한 리뷰 보기
        </Link>
      )}

      <Link to="/orders" className="block text-center text-sm text-ig-primary hover:underline">
        주문 목록으로
      </Link>
    </div>
  );
}
