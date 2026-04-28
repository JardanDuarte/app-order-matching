import { api } from '../../../shared/services/api';

export async function createOrder(data) {
  const res = await api.post('/orders', data);
  return res.data;
}

export async function getActiveOrders() {
  const res = await api.get('/orders');
  return res.data;
}

export async function cancelOrder(orderId) {
  const res = await api.delete(`/orders/${orderId}`);
  return res.data;
}
