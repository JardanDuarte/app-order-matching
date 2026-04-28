const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const btc = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 8
});

function StatItem({ label, value }) {
  return (
    <div className="stat-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function Stats({ stats }) {
  const balance = stats.userBalance || {};

  return (
    <section className="panel">
      <div className="panel-title">Statistics</div>
      <div className="stats-grid">
        <StatItem label="Last price" value={usd.format(stats.lastPrice || 0)} />
        <StatItem label="BTC volume" value={`BTC ${btc.format(stats.btcVolume || 0)}`} />
        <StatItem label="USD volume" value={usd.format(stats.usdVolume || 0)} />
        <StatItem label="High" value={usd.format(stats.high || 0)} />
        <StatItem label="Low" value={usd.format(stats.low || 0)} />
        <StatItem label="USD balance" value={usd.format(balance.usd_balance || 0)} />
        <StatItem label="USD reserved" value={usd.format(balance.reserved_usd || 0)} />
        <StatItem label="BTC balance" value={`BTC ${btc.format(balance.btc_balance || 0)}`} />
        <StatItem label="BTC reserved" value={`BTC ${btc.format(balance.reserved_btc || 0)}`} />
      </div>
    </section>
  );
}
