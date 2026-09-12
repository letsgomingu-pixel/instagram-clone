import type { User } from '@/types';

const PLACEHOLDER_PHONES = new Set(['010-0000-0000', '010-1234-5678']);
const PLACEHOLDER_POSTCODES = new Set(['00000']);

export interface CheckoutShippingFields {
  shippingName: string;
  phone: string;
  postcode: string;
  addressLine1: string;
  addressLine2: string;
}

const EMPTY_SHIPPING: CheckoutShippingFields = {
  shippingName: '',
  phone: '',
  postcode: '',
  addressLine1: '',
  addressLine2: '',
};

/** Prefill checkout/cart shipping only when the user has saved real address data. */
export function getCheckoutShippingFields(user: User | null | undefined): CheckoutShippingFields {
  if (!user) return EMPTY_SHIPPING;

  const phone = user.phone && !PLACEHOLDER_PHONES.has(user.phone) ? user.phone : '';
  const postcode = user.postcode && !PLACEHOLDER_POSTCODES.has(user.postcode) ? user.postcode : '';

  return {
    shippingName: '',
    phone,
    postcode,
    addressLine1: user.address_line1 || '',
    addressLine2: user.address_line2 || '',
  };
}
