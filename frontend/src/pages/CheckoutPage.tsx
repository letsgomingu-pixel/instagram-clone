import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AddressFields } from '@/components/address/AddressFields';
import { Button } from '@/components/common/Button';
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

export function CheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const pid = Number(productId);

  const [quantity, setQuantity] = useState(1);
  const [quote, setQuote] = useState<ordersApi.OrderQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const [shippingName, setShippingName] = useState('');
  const [phone, setPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');

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
      .catch(() => toast.error('상품 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [pid, quantity, isAuthenticated]);

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
      toast.success('결제가 완료되었습니다.');
      navigate(`/orders/${order.id}`, { replace: true });
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-[520px] mx-auto">
      <div className="feed-card p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold mb-1">주문하기</h1>
          <p className="text-sm text-ig-text-secondary">{quote.product_name}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">수량</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-8 w-8 rounded border border-ig-border"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              className="h-8 w-8 rounded border border-ig-border"
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
            <span>{quote.shipping_fee === 0 ? '무료' : formatPrice(quote.shipping_fee)}</span>
          </div>
          {quote.shipping_fee > 0 && (
            <p className="text-xs text-ig-text-secondary">
              {formatPrice(quote.free_shipping_threshold)} 이상 구매 시 무료배송
            </p>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-ig-border">
            <span>결제 금액</span>
            <span className="text-ig-primary">{formatPrice(quote.total_amount)}</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-3">배송지 <span className="text-ig-red">*</span></h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="받는 분"
              value={shippingName}
              onChange={(e) => setShippingName(e.target.value)}
              className="w-full px-3 py-2.5 border border-ig-border rounded-lg bg-ig-secondary text-sm"
            />
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

        <Button type="button" fullWidth size="lg" loading={paying} onClick={handlePay}>
          {formatPrice(quote.total_amount)} 결제하기
        </Button>

        <Link to="/" className="block text-center text-sm text-ig-text-secondary hover:underline">
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  );
}
