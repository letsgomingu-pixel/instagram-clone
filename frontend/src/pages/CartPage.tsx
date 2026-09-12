import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AddressFields } from '@/components/address/AddressFields';
import { Button } from '@/components/common/Button';
import { MediaImage } from '@/components/common/MediaImage';
import { Spinner } from '@/components/common/Spinner';
import { formatPrice } from '@/components/post/ProductInfo';
import * as cartApi from '@/api/cart';
import * as ordersApi from '@/api/orders';
import { useAuth } from '@/hooks/useAuth';
import {
  validatePhone,
  validatePostcode,
  validateAddressLine1,
  validateAddressLine2,
} from '@/utils/validateForm';

async function requestPortOnePayment(payment: ordersApi.PaymentPrepare) {
  const PortOne = await import('@portone/browser-sdk/v2');
  const response = await PortOne.requestPayment({
    storeId: payment.store_id!,
    channelKey: payment.channel_key!,
    paymentId: payment.payment_id,
    orderName: payment.order_name,
    totalAmount: payment.amount,
    currency: 'CURRENCY_KRW',
    payMethod: 'CARD',
  });
  if (response?.code != null) {
    throw new Error(response.message || '결제가 취소되었습니다.');
  }
}

async function pollPaymentConfirmation(orderId: number, maxAttempts = 30): Promise<ordersApi.Order> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const order = await ordersApi.confirmPortOnePayment(orderId);
      if (order.status === 'paid') return order;
      if (order.status === 'failed') throw new Error('결제에 실패했습니다.');
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        const order = await ordersApi.getOrder(orderId);
        if (order.status === 'paid') return order;
        if (order.status === 'failed') throw new Error('결제에 실패했습니다.');
      } else if (!isAxiosError(error)) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('timeout');
}

export function CartPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState<cartApi.Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentsMock, setPaymentsMock] = useState(false);

  const [shippingName, setShippingName] = useState('');
  const [phone, setPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');

  const load = () => {
    setLoading(true);
    cartApi
      .getCart()
      .then(setCart)
      .catch(() => toast.error('장바구니를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    load();
    ordersApi.getPaymentConfig().then((c) => setPaymentsMock(c.mock)).catch(() => undefined);
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user) {
      setShippingName(user.full_name || '');
      setPhone(user.phone || '');
      setPostcode(user.postcode || '');
      setAddressLine1(user.address_line1 || '');
      setAddressLine2(user.address_line2 || '');
    }
  }, [user]);

  const handleQuantityChange = async (itemId: number, quantity: number) => {
    try {
      const updated = await cartApi.updateCartItem(itemId, quantity);
      setCart(updated);
    } catch (error) {
      const message = isAxiosError(error) && typeof error.response?.data?.detail === 'string'
        ? error.response.data.detail
        : '수량 변경에 실패했습니다.';
      toast.error(message);
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      const updated = await cartApi.removeCartItem(itemId);
      setCart(updated);
      toast.success('장바구니에서 삭제했습니다.');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleClearCart = async () => {
    try {
      const updated = await cartApi.clearCart();
      setCart(updated);
      toast.success('장바구니를 비웠습니다.');
    } catch {
      toast.error('장바구니 비우기에 실패했습니다.');
    }
  };

  const handlePay = async () => {
    if (!cart || cart.items.length === 0) return;

    const phoneVal = validatePhone(phone);
    if (!phoneVal.valid) return toast.error(phoneVal.message!);
    const postcodeVal = validatePostcode(postcode);
    if (!postcodeVal.valid) return toast.error(postcodeVal.message!);
    const address1Val = validateAddressLine1(addressLine1);
    if (!address1Val.valid) return toast.error(address1Val.message!);
    const address2Val = validateAddressLine2(addressLine2);
    if (!address2Val.valid) return toast.error(address2Val.message!);
    if (!shippingName.trim()) return toast.error('받는 분 이름을 입력해주세요.');

    setPaying(true);
    try {
      const { order, payment } = await cartApi.checkoutCart({
        shipping_name: shippingName.trim(),
        phone: phone.trim(),
        postcode: postcode.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim(),
      });

      if (payment.mock) {
        await ordersApi.confirmMockPayment(order.id);
        toast.success('결제가 완료되었습니다.');
        navigate(`/orders/${order.id}`, { replace: true });
        return;
      }

      await requestPortOnePayment(payment);
      setPaying(false);
      setConfirming(true);
      try {
        await pollPaymentConfirmation(order.id);
        toast.success('결제가 완료되었습니다.');
        navigate(`/orders/${order.id}`, { replace: true });
      } catch (error) {
        const message = error instanceof Error && error.message === 'timeout'
          ? '결제 확인 중입니다. 주문 내역에서 상태를 확인해주세요.'
          : error instanceof Error
            ? error.message
            : '결제 확인에 실패했습니다.';
        toast.error(message);
        navigate(`/orders/${order.id}`, { replace: true });
      } finally {
        setConfirming(false);
      }
    } catch (error) {
      const message = isAxiosError(error)
        ? (typeof error.response?.data?.detail === 'string' ? error.response.data.detail : '주문에 실패했습니다.')
        : error instanceof Error
          ? error.message
          : '결제에 실패했습니다.';
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  if (loading || !cart) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto relative">
      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center space-y-3">
            <Spinner />
            <p className="font-semibold">결제 확인 중...</p>
          </div>
        </div>
      )}

      <div className="feed-card p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">장바구니</h1>
          {cart.items.length > 0 && (
            <button
              type="button"
              onClick={() => void handleClearCart()}
              className="text-xs text-ig-text-secondary hover:text-ig-red font-semibold"
            >
              전체 비우기
            </button>
          )}
        </div>

        {paymentsMock && cart.items.length > 0 && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            테스트 결제 모드입니다. 실제 카드 결제 없이 주문이 완료됩니다.
          </p>
        )}

        {cart.items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-ig-text-secondary mb-4">장바구니가 비어 있습니다.</p>
            <Link to="/" className="text-sm text-ig-primary font-semibold hover:underline">
              상품 둘러보기
            </Link>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-ig-border">
              {cart.items.map((item) => (
                <li key={item.id} className="py-4 flex gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-ig-secondary shrink-0">
                    {item.image_url ? (
                      <MediaImage src={item.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.product.name}</p>
                    <p className="text-xs text-ig-text-secondary mt-1">
                      {formatPrice(item.product.price)} / {item.product.unit}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                        className="h-7 w-7 rounded border border-ig-border text-sm"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, Math.min(item.product.stock, item.quantity + 1))}
                        disabled={item.quantity >= item.product.stock}
                        className="h-7 w-7 rounded border border-ig-border text-sm disabled:opacity-40"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="ml-auto text-xs text-ig-text-secondary hover:text-ig-red"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="rounded-lg border border-ig-border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>상품 금액</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>배송비</span>
                <span>{formatPrice(cart.shipping_fee)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-ig-border">
                <span>결제 금액</span>
                <span className="text-ig-primary">{formatPrice(cart.total_amount)}</span>
              </div>
            </div>

            {!showCheckout ? (
              <Button type="button" fullWidth size="lg" onClick={() => setShowCheckout(true)}>
                주문하기
              </Button>
            ) : (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold">배송지</h2>
                <div>
                  <label htmlFor="shipping-name" className="block text-xs font-semibold text-ig-text mb-1.5">
                    받는 분 <span className="text-ig-red">*</span>
                  </label>
                  <input
                    id="shipping-name"
                    type="text"
                    placeholder="홍길동"
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-ig-border rounded-lg bg-ig-secondary text-sm"
                    autoComplete="name"
                  />
                </div>
                <AddressFields
                  phone={phone}
                  postcode={postcode}
                  addressLine1={addressLine1}
                  addressLine2={addressLine2}
                  onPhoneChange={setPhone}
                  onPostcodeChange={setPostcode}
                  onAddressLine1Change={setAddressLine1}
                  onAddressLine2Change={setAddressLine2}
                />
                <Button type="button" fullWidth size="lg" loading={paying || confirming} onClick={handlePay}>
                  {formatPrice(cart.total_amount)} 결제하기
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
