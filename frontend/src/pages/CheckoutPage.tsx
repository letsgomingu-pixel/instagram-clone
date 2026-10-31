import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AddressFields } from '@/components/address/AddressFields';
import { FulfillmentToggle, type FulfillmentType } from '@/components/order/FulfillmentToggle';
import { PickupPhoneAlertButton } from '@/components/order/PickupPhoneAlertButton';
import { ShippingPolicyNote } from '@/components/order/ShippingPolicyNote';
import { Button } from '@/components/common/Button';
import { PostCoverMedia } from '@/components/post/PostCoverMedia';
import { Spinner } from '@/components/common/Spinner';
import { formatPrice } from '@/components/post/ProductInfo';
import * as ordersApi from '@/api/orders';
import { useAuth } from '@/hooks/useAuth';
import { openInicisPayment } from '@/payments/inicis';
import { getCheckoutShippingFields } from '@/utils/shipping';
import {
  formatPhoneInput,
  validatePhone,
  validatePostcode,
  validateAddressLine1,
  validateAddressLine2,
} from '@/utils/validateForm';

export function CheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const pid = Number(productId);

  const [quantity, setQuantity] = useState(1);
  const [quote, setQuote] = useState<ordersApi.OrderQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
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
    const shipping = getCheckoutShippingFields(user);
    setShippingName(shipping.shippingName);
    setPhone(shipping.phone);
    setPostcode(shipping.postcode);
    setAddressLine1(shipping.addressLine1);
    setAddressLine2(shipping.addressLine2);
  }, [user]);

  useEffect(() => {
    if (!pid || !isAuthenticated) return;
    let cancelled = false;
    if (!quote) setLoading(true);
    ordersApi
      .quoteOrder(pid, quantity, fulfillment)
      .then((next) => {
        if (!cancelled) setQuote(next);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = isAxiosError(error) && typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : '상품 정보를 불러오지 못했습니다.';
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pid, quantity, isAuthenticated, fulfillment]);

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
    if (!shippingName.trim()) return toast.error(fulfillment === 'pickup' ? '주문자 이름을 입력해주세요.' : '받는 분 이름을 입력해주세요.');
    if (fulfillment === 'delivery') {
      const postcodeVal = validatePostcode(postcode);
      if (!postcodeVal.valid) return toast.error(postcodeVal.message!);
      const address1Val = validateAddressLine1(addressLine1);
      if (!address1Val.valid) return toast.error(address1Val.message!);
      const address2Val = validateAddressLine2(addressLine2);
      if (!address2Val.valid) return toast.error(address2Val.message!);
    }

    setPaying(true);
    try {
      const { payment } = await ordersApi.createOrder({
        product_id: pid,
        quantity,
        shipping_name: shippingName.trim(),
        phone: phone.trim(),
        postcode: fulfillment === 'pickup' ? undefined : postcode.trim(),
        address_line1: fulfillment === 'pickup' ? undefined : addressLine1.trim(),
        address_line2: fulfillment === 'pickup' ? undefined : addressLine2.trim(),
        fulfillment_type: fulfillment,
      });

      if (!payment.inicis) {
        throw new Error('이니시스 결제 정보를 만들지 못했습니다.');
      }
      await openInicisPayment(payment.inicis);
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
      <div className="feed-card p-6 space-y-6">
        <div className="flex gap-4">
          {quote.image_url && (
            <div className="h-20 w-20 min-h-0 shrink-0 overflow-hidden rounded-lg bg-ig-secondary">
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

        <div>
          <h2 className="text-sm font-semibold mb-3">수령 방법</h2>
          <FulfillmentToggle value={fulfillment} onChange={setFulfillment} />
          {fulfillment === 'pickup' ? (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-ig-text-secondary">
                결제 후 판매자가 주문을 수락하고 포장이 끝나면, 앱 알림으로 알려드립니다.
              </p>
              <PickupPhoneAlertButton />
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-ig-text-secondary">
                결제되면 상품 준비 중으로 바뀌고 앱 알림이 갑니다. 운송장이 등록되면 배송 중, 택배가 도착하면 배송 완료로 바뀝니다.
              </p>
              <ShippingPolicyNote />
            </div>
          )}
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
            <span>{fulfillment === 'pickup' ? '포장비' : '배송비'}</span>
            <span>{formatPrice(quote.shipping_fee)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-ig-border">
            <span>결제 금액</span>
            <span className="text-ig-primary">{formatPrice(quote.total_amount)}</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-3">
            {fulfillment === 'pickup' ? '주문자' : '배송지'} <span className="text-ig-red">*</span>
          </h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="shipping-name" className="block text-xs font-semibold text-ig-text mb-1.5">
                {fulfillment === 'pickup' ? '이름' : '받는 분'} <span className="text-ig-red">*</span>
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
            {fulfillment === 'pickup' ? (
              <div>
                <label htmlFor="pickup-phone" className="block text-xs font-semibold text-ig-text mb-1.5">
                  연락처 <span className="text-ig-red">*</span>
                </label>
                <input
                  id="pickup-phone"
                  type="tel"
                  placeholder="010-0000-0000"
                  value={formatPhoneInput(phone)}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  maxLength={13}
                  inputMode="numeric"
                  className="w-full px-3 py-2.5 border border-ig-border rounded-lg bg-ig-secondary text-sm"
                  autoComplete="tel"
                />
              </div>
            ) : (
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
            )}
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
