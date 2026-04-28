import { api } from '../../../shared/services/api';

export async function getStats() {
  const res = await api.get('/market/stats');
  return res.data;
}

export async function getOrderBook() {
  const res = await api.get('/market/orderbook');
  return res.data;
}

export async function getTrades() {
  const res = await api.get('/market/trades');
  return res.data;
}

export async function getMyTrades() {
  const res = await api.get('/market/my-trades');
  return res.data;
}
