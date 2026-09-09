import type { Product } from '@/types';
import type { Order, PaymentPrepare } from '@/api/orders';
import { api } from './client';

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  product: Product;
  image_url?: string | null;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  base_shipping_fee: number;
}

export interface CartCheckoutPayload {
  shipping_name: string;
  phone: string;
  postcode: string;
  address_line1: string;
  address_line2: string;
}

export async function getCart(): Promise<Cart> {
  const { data } = await api.get<Cart>('/cart');
  return data;
}

export async function addToCart(productId: number, quantity = 1): Promise<Cart> {
  const { data } = await api.post<Cart>('/cart/items', { product_id: productId, quantity });
  return data;
}

export async function updateCartItem(itemId: number, quantity: number): Promise<Cart> {
  const { data } = await api.patch<Cart>(`/cart/items/${itemId}`, { quantity });
  return data;
}

export async function removeCartItem(itemId: number): Promise<Cart> {
  const { data } = await api.delete<Cart>(`/cart/items/${itemId}`);
  return data;
}

export async function checkoutCart(payload: CartCheckoutPayload): Promise<{ order: Order; payment: PaymentPrepare }> {
  const { data } = await api.post<{ order: Order; payment: PaymentPrepare }>('/cart/checkout', payload);
  return data;
}
