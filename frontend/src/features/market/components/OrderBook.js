const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const btc = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 8
});

function BookTable({ title, rows, onSelect, emptyLabel }) {
  return (
    <div>
      <div className="panel-title">{title}</div>
      <div className="table-responsive">
        <table className="table table-sm align-middle market-table">
          <thead>
            <tr>
              <th>Price</th>
              <th className="text-end">Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="2" className="text-muted">{emptyLabel}</td>
              </tr>
            )}
            {rows.map(row => (
              <tr key={`${title}-${row.price}`} role="button" onClick={() => onSelect(row)}>
                <td>{usd.format(row.price)}</td>
                <td className="text-end">BTC {btc.format(row.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OrderBook({ orderbook, onBidClick, onAskClick }) {
  return (
    <section className="panel h-100">
      <div className="row g-4">
        <div className="col-lg-6">
          <BookTable
            title="Bid"
            rows={orderbook.bids || []}
            emptyLabel="No bids"
            onSelect={onBidClick}
          />
        </div>
        <div className="col-lg-6">
          <BookTable
            title="Ask"
            rows={orderbook.asks || []}
            emptyLabel="No asks"
            onSelect={onAskClick}
          />
        </div>
      </div>
    </section>
  );
}
