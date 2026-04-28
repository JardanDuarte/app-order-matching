import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderForm from '../../orders/components/OrderForm';
import ActiveOrders from '../../orders/components/ActiveOrders';
import Stats from '../components/Stats';
import OrderBook from '../components/OrderBook';
import Trades from '../components/Trades';
import { useMarket } from '../hooks/useMarket';

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeOrders, loading, myTrades, orderbook, refresh, stats, trades } = useMarket();
  const [buyDraft, setBuyDraft] = useState(null);
  const [sellDraft, setSellDraft] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  function logout() {
    localStorage.removeItem('token');
    navigate('/');
  }

  return (
    <main className="exchange-shell">
      <nav className="navbar navbar-expand bg-white border-bottom sticky-top">
        <div className="container-fluid px-4">
          <div className="d-flex align-items-center gap-3">
            <span className="navbar-brand mb-0 h1">USD/BTC Exchange</span>
            {user.username && (
              <span className="user-badge">
                {user.username}
              </span>
            )}
          </div>
          <button className="btn btn-outline-secondary btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="container-fluid p-4">
        {loading && <div className="alert alert-light border">Loading market...</div>}

        <div className="row g-4">
          <div className="col-12">
            <Stats stats={stats} />
          </div>

          <div className="col-xl-3 col-lg-6">
            <OrderForm type="BUY" initialValues={buyDraft} onCreated={refresh} />
          </div>

          <div className="col-xl-3 col-lg-6">
            <OrderForm type="SELL" initialValues={sellDraft} onCreated={refresh} />
          </div>

          <div className="col-xl-6">
            <OrderBook
              orderbook={orderbook}
              onAskClick={row => setBuyDraft(row)}
              onBidClick={row => setSellDraft(row)}
            />
          </div>

          <div className="col-xl-6">
            <Trades title="Global matches" trades={trades} />
          </div>

          <div className="col-xl-6">
            <ActiveOrders orders={activeOrders} onCancelled={refresh} />
          </div>

          <div className="col-xl-6">
            <Trades title="My history" trades={myTrades} showType />
          </div>
        </div>
      </div>
    </main>
  );
}
