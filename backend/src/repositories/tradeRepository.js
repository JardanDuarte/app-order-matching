import { db } from '../config/db.js';

export async function createTrade(conn, trade) {
  const {
    buyOrderId,
    sellOrderId,
    makerOrderId,
    takerOrderId,
    price,
    amount,
    makerFee,
    takerFee
  } = trade;

  const [result] = await conn.query(
    `INSERT INTO trades
      (buy_order_id, sell_order_id, maker_order_id, taker_order_id, price, amount, maker_fee, taker_fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [buyOrderId, sellOrderId, makerOrderId, takerOrderId, price, amount, makerFee, takerFee]
  );

  return result.insertId;
}

export async function getRecentTrades(limit = 50) {
  const [rows] = await db.query(
    `SELECT id, price, amount, created_at
      FROM trades
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [limit]
  );

  return rows;
}

export async function getUserTrades(userId, limit = 50) {
  const [rows] = await db.query(
    `SELECT
        t.id,
        t.price,
        t.amount,
        t.created_at,
        CASE WHEN bo.user_id = ? THEN 'BUY' ELSE 'SELL' END as type
      FROM trades t
      JOIN orders bo ON bo.id = t.buy_order_id
      JOIN orders so ON so.id = t.sell_order_id
      WHERE bo.user_id = ? OR so.user_id = ?
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ?`,
    [userId, userId, userId, limit]
  );

  return rows;
}

export async function getStats() {
  const [rows] = await db.query(`
    SELECT
      (SELECT price FROM trades ORDER BY created_at DESC, id DESC LIMIT 1) as last_price,
      COALESCE(SUM(amount), 0) as btc_volume,
      COALESCE(SUM(price * amount), 0) as usd_volume,
      COALESCE(MAX(price), 0) as high,
      COALESCE(MIN(price), 0) as low
    FROM trades
    WHERE created_at >= NOW() - INTERVAL 1 DAY
  `);

  return rows[0];
}
