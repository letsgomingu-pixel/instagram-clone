import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AddressFields } from '@/components/address/AddressFields';
import { FulfillmentToggle, type FulfillmentType } from '@/components/order/FulfillmentToggle';
import { PickupPhoneAlertButton } from '@/components/order/PickupPhoneAlertButton';
import { ShippingPolicyNote } from '@/components/order/ShippingPolicyNote';
import { Button } from '@/components/common/Button';
import { PostCoverMedia } from '@/components/post/PostCoverMedia';
import { Spinner } from '@/components/common/Spinner';
import { formatPrice } from '@/components/post/ProductInfo';
import * as cartApi from '@/api/cart';
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

export function CartPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState<cartApi.Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
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
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const shipping = getCheckoutShippingFields(user);
    setShippingName(shipping.shippingName);
    setPhone(shipping.phone);
    setPostcode(shipping.postcode);
    setAddressLine1(shipping.addressLine1);
    setAddressLine2(shipping.addressLine2);
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
      const { payment } = await cartApi.checkoutCart({
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

  if (loading || !cart) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto relative">
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
                  <div className="h-16 w-16 min-h-0 shrink-0 overflow-hidden rounded-lg bg-ig-secondary">
                    {item.image_url ? (
                      <PostCoverMedia imageUrl={item.image_url} alt={item.product.name} />
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

            <FulfillmentToggle value={fulfillment} onChange={setFulfillment} />
            {fulfillment === 'pickup' ? (
              <div className="space-y-2">
                <p className="text-xs text-ig-text-secondary">
                  결제 후 판매자가 주문을 수락하고 포장이 끝나면, 앱 알림으로 알려드립니다.
                </p>
                <PickupPhoneAlertButton />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-ig-text-secondary">
                  결제되면 상품 준비 중으로 바뀌고 앱 알림이 갑니다. 운송장이 등록되면 배송 중, 택배가 도착하면 배송 완료로 바뀝니다.
                </p>
                <ShippingPolicyNote />
              </div>
            )}

            <div className="rounded-lg border border-ig-border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>상품 금액</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{fulfillment === 'pickup' ? '포장비' : '배송비'}</span>
                <span>{formatPrice(fulfillment === 'pickup' ? 0 : cart.shipping_fee)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-ig-border">
                <span>결제 금액</span>
                <span className="text-ig-primary">
                  {formatPrice(fulfillment === 'pickup' ? cart.subtotal : cart.total_amount)}
                </span>
              </div>
            </div>

            {!showCheckout ? (
              <Button type="button" fullWidth size="lg" onClick={() => setShowCheckout(true)}>
                주문하기
              </Button>
            ) : (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold">{fulfillment === 'pickup' ? '주문자' : '배송지'}</h2>
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
                <Button type="button" fullWidth size="lg" loading={paying} onClick={handlePay}>
                  {formatPrice(fulfillment === 'pickup' ? cart.subtotal : cart.total_amount)} 결제하기
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
