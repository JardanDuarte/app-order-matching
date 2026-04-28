import { cancelOrder } from '../services/orderService';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const btc = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 8
});

export default function ActiveOrders({ orders, onCancelled }) {
  async function handleCancel(orderId) {
    await cancelOrder(orderId);
    onCancelled();
  }

  return (
    <section className="panel h-100">
      <div className="panel-title">My active orders</div>
      <div className="table-responsive">
        <table className="table table-sm align-middle market-table">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Price</th>
              <th>Type</th>
              <th>Status</th>
              <th className="text-end">Cancel</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan="5" className="text-muted">No active orders</td>
              </tr>
            )}
            {orders.map(order => (
              <tr key={order.id}>
                <td>BTC {btc.format(order.remaining_amount)}</td>
                <td>{usd.format(order.price)}</td>
                <td>{order.type}</td>
                <td>{order.status}</td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(order.id)}>
                    X
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
