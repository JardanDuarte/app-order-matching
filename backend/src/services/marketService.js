import { getOrderBook } from '../repositories/orderRepository.js';
import { getRecentTrades, getStats, getUserTrades } from '../repositories/tradeRepository.js';
import { getUserBalance } from '../repositories/userRepository.js';

export async function getOrderBookService() {
  const data = await getOrderBook();

  return data.reduce(
    (book, row) => {
      const entry = {
        price: row.price,
        volume: row.volume
      };

      if (row.type === 'BUY') {
        book.bids.push(entry);
      } else {
        book.asks.push(entry);
      }

      return book;
    },
    { bids: [], asks: [] }
  );
}

export async function getTradesService() {
  const trades = await getRecentTrades();

  return trades.map(trade => ({
    id: trade.id,
    price: trade.price,
    volume: trade.amount,
    date: trade.created_at
  }));
}

export async function getUserTradesService(userId) {
  const trades = await getUserTrades(userId);

  return trades.map(trade => ({
    id: trade.id,
    price: trade.price,
    volume: trade.amount,
    type: trade.type,
    date: trade.created_at
  }));
}

export async function getStatsService(userId) {
  const stats = await getStats();
  const balance = userId ? await getUserBalance(userId) : null;

  return {
    lastPrice: stats.last_price || 0,
    btcVolume: stats.btc_volume || 0,
    usdVolume: stats.usd_volume || 0,
    high: stats.high || 0,
    low: stats.low || 0,
    userBalance: balance
  };
}
