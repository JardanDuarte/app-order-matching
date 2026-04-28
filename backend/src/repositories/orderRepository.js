import { db } from '../config/db.js';

export async function createOrder(conn, data) {
  const { userId, type, price, amount } = data;

  const [result] = await conn.query(
    `INSERT INTO orders (user_id, type, price, amount, remaining_amount, status)
      VALUES (?, ?, ?, ?, ?, 'QUEUED')`,
    [userId, type, price, amount, amount]
  );

  return result.insertId;
}

export async function findOrderForUpdate(conn, orderId) {
  const [rows] = await conn.query(
    'SELECT * FROM orders WHERE id = ? FOR UPDATE',
    [orderId]
  );

  return rows[0];
}

export async function findMatchingOrdersForUpdate(conn, order) {
  const isBuy = order.type === 'BUY';

  const sql = isBuy
    ? `SELECT *
        FROM orders
        WHERE type = 'SELL'
          AND status IN ('OPEN', 'PARTIAL')
          AND remaining_amount > 0
          AND price <= ?
          AND user_id <> ?
        ORDER BY price ASC, created_at ASC, id ASC
        FOR UPDATE`
    : `SELECT *
        FROM orders
        WHERE type = 'BUY'
          AND status IN ('OPEN', 'PARTIAL')
          AND remaining_amount > 0
          AND price >= ?
          AND user_id <> ?
        ORDER BY price DESC, created_at ASC, id ASC
        FOR UPDATE`;

  const [rows] = await conn.query(sql, [order.price, order.user_id]);
  return rows;
}

export async function updateOrderRemaining(conn, orderId, remainingAmount, originalAmount) {
  let status = 'OPEN';

  if (remainingAmount <= 0.00000001) {
    status = 'COMPLETED';
    remainingAmount = 0;
  } else if (remainingAmount < originalAmount) {
    status = 'PARTIAL';
  }

  await conn.query(
    `UPDATE orders
      SET remaining_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [remainingAmount, status, orderId]
  );

  return status;
}

export async function cancelOrder(conn, orderId, userId) {
  const [rows] = await conn.query(
    `SELECT *
      FROM orders
      WHERE id = ?
        AND user_id = ?
        AND status IN ('QUEUED', 'OPEN', 'PARTIAL')
      FOR UPDATE`,
    [orderId, userId]
  );

  const order = rows[0];

  if (!order) {
    return null;
  }

  await conn.query(
    `UPDATE orders
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [orderId]
  );

  return order;
}

export async function getOrderBook() {
  const [rows] = await db.query(`
    SELECT
      price,
      type,
      SUM(remaining_amount) as volume
    FROM orders
    WHERE status IN ('OPEN', 'PARTIAL')
      AND remaining_amount > 0
    GROUP BY price, type
    ORDER BY
      CASE WHEN type = 'BUY' THEN price END DESC,
      CASE WHEN type = 'SELL' THEN price END ASC
  `);

  return rows;
}

export async function getUserActiveOrders(userId) {
  const [rows] = await db.query(
    `SELECT id, type, price, amount, remaining_amount, status, created_at
      FROM orders
      WHERE user_id = ?
        AND status IN ('QUEUED', 'OPEN', 'PARTIAL')
      ORDER BY created_at DESC, id DESC`,
    [userId]
  );

  return rows;
}
