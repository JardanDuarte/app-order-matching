import { useEffect, useMemo, useState } from 'react';
import { createOrder } from '../services/orderService';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

function formatDecimalInput(value, decimals = 8) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '';
  }

  return numericValue.toFixed(decimals).replace(/\.?0+$/, '');
}

function isDecimalInput(value) {
  return value === '' || /^\d*\.?\d*$/.test(value);
}

export default function OrderForm({ type, initialValues, onCreated }) {
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialValues) return;

    setPrice(formatDecimalInput(initialValues.price, 2));
    setAmount(formatDecimalInput(initialValues.amount || initialValues.volume, 8));
  }, [initialValues]);

  const total = useMemo(() => {
    const numericPrice = Number(price);
    const numericAmount = Number(amount);

    if (!numericPrice || !numericAmount) return 0;

    return numericPrice * numericAmount;
  }, [amount, price]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      setLoading(true);

      await createOrder({
        type,
        price: Number(price),
        amount: Number(amount)
      });

      setPrice('');
      setAmount('');
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar ordem');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel h-100">
      <div className="panel-title">{type === 'BUY' ? 'Buy' : 'Sell'}</div>
      <form onSubmit={handleSubmit}>
        <label className="form-label">Amount</label>
        <div className="input-group mb-3">
          <input
            className="form-control"
            inputMode="decimal"
            placeholder="0.00000000"
            type="text"
            value={amount}
            onBlur={() => setAmount(formatDecimalInput(amount, 8))}
            onChange={event => {
              if (isDecimalInput(event.target.value)) {
                setAmount(event.target.value);
              }
            }}
          />
          <span className="input-group-text">BTC</span>
        </div>

        <label className="form-label">Price</label>
        <div className="input-group mb-3">
          <span className="input-group-text">USD</span>
          <input
            className="form-control"
            inputMode="decimal"
            placeholder="0.00"
            type="text"
            value={price}
            onBlur={() => setPrice(formatDecimalInput(price, 2))}
            onChange={event => {
              if (isDecimalInput(event.target.value)) {
                setPrice(event.target.value);
              }
            }}
          />
        </div>

        <div className="order-total mb-3">
          <span>Total</span>
          <strong>{usd.format(total)}</strong>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button className={`btn w-100 ${type === 'BUY' ? 'btn-success' : 'btn-danger'}`} disabled={loading}>
          {loading ? 'Sending...' : `Submit ${type}`}
        </button>
      </form>
    </section>
  );
}
