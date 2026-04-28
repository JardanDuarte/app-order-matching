const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const btc = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 8
});

export default function Trades({ title, trades, showType = false }) {
  return (
    <section className="panel h-100">
      <div className="panel-title">{title}</div>
      <div className="table-responsive">
        <table className="table table-sm align-middle market-table">
          <thead>
            <tr>
              <th>Price</th>
              <th>Volume</th>
              {showType && <th>Type</th>}
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 && (
              <tr>
                <td colSpan={showType ? 3 : 2} className="text-muted">No matches yet</td>
              </tr>
            )}
            {trades.map(trade => (
              <tr key={trade.id}>
                <td>{usd.format(trade.price)}</td>
                <td>BTC {btc.format(trade.volume)}</td>
                {showType && <td>{trade.type}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
