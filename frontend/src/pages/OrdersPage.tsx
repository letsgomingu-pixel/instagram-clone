import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { OrderTimeline } from '@/components/order/OrderTimeline';
import { PickupReadyCard } from '@/components/order/PickupReadyCard';
import { ProductInfo, formatPrice } from '@/components/post/ProductInfo';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import * as ordersApi from '@/api/orders';
import { enableOrderPush, orderPushSupport } from '@/pwa/orderPush';
import { carrierLabel } from '@/utils/carriers';

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

function statusLabel(status: string, fulfillment?: string) {
  if (fulfillment === 'pickup') {
    if (status === 'preparing') return '포장 중';
    if (status === 'ready') return '포장 완료';
    if (status === 'delivered') return '픽업 완료';
  }
  return STATUS_LABELS[status] || status;
}

function OrderStatusBadge({ status, fulfillment }: { status: string; fulfillment?: string }) {
  return (
    <span className="text-xs font-semibold px-2 py-1 rounded bg-ig-secondary text-ig-text">
      {statusLabel(status, fulfillment)}
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
                      {order.fulfillment_type !== 'pickup' && order.tracking_number && (
                        <p className="text-xs text-ig-text mt-1">
                          {carrierLabel(order.carrier) ? `${carrierLabel(order.carrier)} · ` : ''}
                          운송장번호 <span className="font-mono">{order.tracking_number}</span>
                        </p>
                      )}
                      {order.fulfillment_type === 'pickup' && order.pickup_ready_minutes && (
                        <p className="text-xs text-ig-primary mt-1">포장 {order.pickup_ready_minutes}분</p>
                      )}
                    </div>
                    <OrderStatusBadge status={order.status} fulfillment={order.fulfillment_type} />
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
  const [pushState, setPushState] = useState<'unknown' | 'on' | 'off' | 'denied' | 'unsupported' | 'install'>('unknown');
  const [enablingPush, setEnablingPush] = useState(false);
  const statusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const load = (initial: boolean) => {
      if (initial) {
        setLoading(true);
        setError(false);
      }
      ordersApi
        .getOrder(Number(orderId))
        .then((next) => {
          if (cancelled) return;
          statusRef.current = next.status;
          setOrder(next);
        })
        .catch(() => {
          if (!initial || cancelled) return;
          setError(true);
          toast.error('주문 정보를 불러오지 못했습니다.');
        })
        .finally(() => {
          if (initial && !cancelled) setLoading(false);
        });
    };
    load(true);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (['delivered', 'cancelled', 'failed'].includes(statusRef.current || '')) return;
      load(false);
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [orderId]);

  useEffect(() => {
    if (order?.fulfillment_type !== 'pickup') return;
    if (!['paid', 'preparing', 'ready'].includes(order.status)) return;
    const support = orderPushSupport();
    if (support === 'unsupported' || support === 'denied') {
      setPushState(support);
      return;
    }
    if (support !== 'granted') {
      setPushState('off');
      return;
    }
    let cancelled = false;
    enableOrderPush().then((result) => {
      if (!cancelled) setPushState(result === 'enabled' ? 'on' : result);
    });
    return () => {
      cancelled = true;
    };
  }, [order?.fulfillment_type, order?.status]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const showPhoneAlert =
    !!order &&
    order.fulfillment_type === 'pickup' &&
    ['paid', 'preparing', 'ready'].includes(order.status) &&
    pushState !== 'unknown' &&
    (pushState !== 'unsupported' || ios);
  const canCancel = order && (order.status === 'pending' || order.status === 'paid');

  const handleEnablePush = async () => {
    setEnablingPush(true);
    try {
      const result = await enableOrderPush();
      setPushState(result === 'enabled' ? 'on' : result);
      if (result === 'enabled') toast.success('휴대폰 알림을 켰습니다.');
      else if (result === 'denied') toast.error('브라우저에서 알림이 차단되어 있습니다.');
      else if (result === 'install') toast.error('아이폰은 홈 화면에 추가한 뒤 알림을 켤 수 있습니다.');
      else toast.error('이 휴대폰에서는 알림을 켤 수 없습니다.');
    } finally {
      setEnablingPush(false);
    }
  };

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
          <OrderStatusBadge status={order.status} fulfillment={order.fulfillment_type} />
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
            <span className="text-ig-text-secondary">{order.fulfillment_type === 'pickup' ? '포장비' : '배송비'}</span>
            <span>{formatPrice(order.shipping_fee)}</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t border-ig-border">
            <span>결제 금액</span>
            <span className="text-ig-primary">{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {order.fulfillment_type === 'pickup' && (
        <div className="feed-card p-6 space-y-3">
          <PickupReadyCard order={order} />
          {showPhoneAlert && (
            <div className="rounded-lg border border-ig-border px-4 py-3 text-sm">
              {pushState === 'on' ? (
                <p>주문을 수락하거나 포장이 끝나면 이 휴대폰으로 알림이 갑니다.</p>
              ) : pushState === 'unsupported' ? (
                <p>아이폰은 브라우저 메뉴에서 홈 화면에 추가한 뒤, 그 앱에서 알림을 켤 수 있습니다.</p>
              ) : (
                <>
                  <p>주문 수락과 포장 완료를 이 휴대폰 알림으로 알려드립니다.</p>
                  {pushState === 'denied' ? (
                    <p className="mt-1 text-ig-text-secondary">브라우저 설정에서 알림을 허용해 주세요.</p>
                  ) : pushState === 'install' ? (
                    <p className="mt-1 text-ig-text-secondary">아이폰은 홈 화면에 추가한 뒤 알림을 켤 수 있습니다.</p>
                  ) : (
                    <Button className="mt-3" size="sm" loading={enablingPush} onClick={handleEnablePush}>
                      휴대폰 알림 켜기
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="feed-card p-6">
        <h2 className="font-semibold mb-4 text-sm">
          {order.fulfillment_type === 'pickup' ? '포장 현황' : '배송 현황'}
        </h2>
        <OrderTimeline order={order} />
      </div>

      <div className="feed-card p-6 text-sm space-y-2">
        <h2 className="font-semibold mb-2">{order.fulfillment_type === 'pickup' ? '수령 안내' : '배송지'}</h2>
        <p>{order.shipping_name}</p>
        <p>{order.phone}</p>
        {order.fulfillment_type === 'pickup' ? (
          <p>가게에서 직접 받아가는 주문입니다.</p>
        ) : (
          <p>
            [{order.postcode}] {order.address_line1} {order.address_line2}
          </p>
        )}
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
