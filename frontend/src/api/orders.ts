import type { PaginatedResponse, Product } from '@/types';
import { api } from './client';

export interface OrderQuote {
  product_id: number;
  product_name: string;
  unit_price: number;
  unit: string;
  quantity: number;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  free_shipping_threshold: number;
  base_shipping_fee: number;
}

export interface Order {
  id: number;
  product_id: number;
  product?: Product | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  status: string;
  shipping_name: string;
  phone: string;
  postcode: string;
  address_line1: string;
  address_line2: string;
  tracking_number?: string | null;
  payment_id?: string | null;
  created_at: string;
  paid_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  can_review?: boolean;
  review_post_id?: number | null;
}

export interface PaymentPrepare {
  order_id: number;
  payment_id: string;
  amount: number;
  store_id?: string | null;
  channel_key?: string | null;
  mock: boolean;
  order_name: string;
}

export interface OrderCreatePayload {
  product_id: number;
  quantity: number;
  shipping_name: string;
  phone: string;
  postcode: string;
  address_line1: string;
  address_line2: string;
}

export async function quoteOrder(productId: number, quantity: number): Promise<OrderQuote> {
  const { data } = await api.post<OrderQuote>('/orders/quote', { product_id: productId, quantity });
  return data;
}

export async function createOrder(payload: OrderCreatePayload): Promise<{ order: Order; payment: PaymentPrepare }> {
  const { data } = await api.post<{ order: Order; payment: PaymentPrepare }>('/orders', payload);
  return data;
}

export async function getMyOrders(page = 1, limit = 20): Promise<PaginatedResponse<Order>> {
  const { data } = await api.get<PaginatedResponse<Order>>('/orders/me', { params: { page, limit } });
  return data;
}

export async function getOrder(orderId: number): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${orderId}`);
  return data;
}

export async function confirmMockPayment(orderId: number): Promise<Order> {
  const { data } = await api.post<Order>(`/payments/mock/${orderId}/confirm`);
  return data;
}

export async function getPaymentConfig(): Promise<{ mock: boolean; store_id?: string; channel_key?: string }> {
  const { data } = await api.get<{ mock: boolean; store_id?: string; channel_key?: string }>('/payments/config');
  return data;
}
