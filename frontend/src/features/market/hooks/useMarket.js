import { useCallback, useEffect, useState } from 'react';
import { getOrderBook, getStats, getTrades, getMyTrades } from '../services/marketService';
import { getActiveOrders } from '../../orders/services/orderService';
import socket from '../../../shared/services/socket';

export function useMarket() {
  const [stats, setStats] = useState({});
  const [orderbook, setOrderbook] = useState({ bids: [], asks: [] });
  const [trades, setTrades] = useState([]);
  const [myTrades, setMyTrades] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [statsData, orderBookData, tradesData, myTradesData, activeOrdersData] = await Promise.all([
      getStats(),
      getOrderBook(),
      getTrades(),
      getMyTrades(),
      getActiveOrders()
    ]);

    setStats(statsData);
    setOrderbook(orderBookData);
    setTrades(tradesData);
    setMyTrades(myTradesData);
    setActiveOrders(activeOrdersData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    socket.on('market:updated', load);

    return () => {
      socket.off('market:updated', load);
    };
  }, [load]);

  return {
    activeOrders,
    loading,
    myTrades,
    orderbook,
    refresh: load,
    stats,
    trades
  };
}
