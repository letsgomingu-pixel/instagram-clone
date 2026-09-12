import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AddressFields } from '@/components/address/AddressFields';
import { Button } from '@/components/common/Button';
import { PostCoverMedia } from '@/components/post/PostCoverMedia';
import { Spinner } from '@/components/common/Spinner';
import { formatPrice } from '@/components/post/ProductInfo';
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
        const detail = error.response.data?.detail;
        if (typeof detail === 'string' && detail.includes('not pending')) {
          const order = await ordersApi.getOrder(orderId);
          if (order.status === 'paid') return order;
          if (order.status === 'failed') throw new Error('결제에 실패했습니다.');
        } else {
          throw error;
        }
      } else if (!isAxiosError(error)) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('timeout');
}

export function CheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const pid = Number(productId);

  const [quantity, setQuantity] = useState(1);
  const [quote, setQuote] = useState<ordersApi.OrderQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [paymentsMock, setPaymentsMock] = useState(false);

  const [shippingName, setShippingName] = useState('');
  const [phone, setPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');

  useEffect(() => {
    ordersApi.getPaymentConfig().then((c) => setPaymentsMock(c.mock)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/checkout/${productId}` } });
    }
  }, [isAuthenticated, navigate, productId]);

  useEffect(() => {
    if (user) {
      setShippingName(user.full_name || '');
      setPhone(user.phone || '');
      setPostcode(user.postcode || '');
      setAddressLine1(user.address_line1 || '');
      setAddressLine2(user.address_line2 || '');
    }
  }, [user]);

  useEffect(() => {
    if (!pid || !isAuthenticated) return;
    setLoading(true);
    ordersApi
      .quoteOrder(pid, quantity)
      .then(setQuote)
      .catch((error) => {
        const message = isAxiosError(error) && typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : '상품 정보를 불러오지 못했습니다.';
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [pid, quantity, isAuthenticated]);

  const maxQuantity = quote ? Math.min(quote.stock, 99) : 99;

  useEffect(() => {
    if (quote && quantity > maxQuantity) {
      setQuantity(Math.max(1, maxQuantity));
    }
  }, [quote, maxQuantity, quantity]);

  const handlePay = async () => {
    if (!quote) return;

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
      const { order, payment } = await ordersApi.createOrder({
        product_id: pid,
        quantity,
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

  if (loading || !quote) {
    return (
      <div className="feed-card py-20 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (quote.stock <= 0) {
    return (
      <div className="max-w-[520px] mx-auto feed-card p-8 text-center space-y-4">
        <p className="text-sm text-ig-text-secondary">품절된 상품입니다.</p>
        <Link to="/" className="text-sm text-ig-primary font-semibold hover:underline">
          쇼핑 계속하기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[520px] mx-auto relative">
      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center space-y-3">
            <Spinner />
            <p className="font-semibold">결제 확인 중...</p>
            <p className="text-sm text-ig-text-secondary">잠시만 기다려주세요.</p>
          </div>
        </div>
      )}

      <div className="feed-card p-6 space-y-6">
        {paymentsMock && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            테스트 결제 모드입니다. 실제 카드 결제 없이 주문이 완료됩니다.
          </p>
        )}

        <div className="flex gap-4">
          {quote.image_url && (
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-ig-secondary shrink-0">
              <PostCoverMedia imageUrl={quote.image_url} alt={quote.product_name} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold mb-1">주문하기</h1>
            <p className="text-sm font-medium">{quote.product_name}</p>
            <p className="text-xs text-ig-text-secondary mt-1">
              {formatPrice(quote.unit_price)} / {quote.unit}
            </p>
            <p className="text-xs text-ig-text-secondary mt-1">재고 {quote.stock}개</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">수량</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="h-8 w-8 rounded border border-ig-border disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              className="h-8 w-8 rounded border border-ig-border disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-ig-border p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>상품 금액</span>
            <span>{formatPrice(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>배송비</span>
            <span>{formatPrice(quote.shipping_fee)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-ig-border">
            <span>결제 금액</span>
            <span className="text-ig-primary">{formatPrice(quote.total_amount)}</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-3">배송지 <span className="text-ig-red">*</span></h2>
          <div className="space-y-3">
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
          </div>
        </div>

        <Button type="button" fullWidth size="lg" loading={paying || confirming} onClick={handlePay}>
          {formatPrice(quote.total_amount)} 결제하기
        </Button>

        <Link to="/" className="block text-center text-sm text-ig-text-secondary hover:underline">
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  );
}
