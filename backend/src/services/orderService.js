import { db } from '../config/db.js';
import { ORDER_QUEUE, redis } from '../config/redis.js';
import { findUserById } from '../repositories/userRepository.js';
import * as orderRepository from '../repositories/orderRepository.js';
import { publishMarketUpdate } from './marketEventService.js';

const MAKER_FEE_RATE = 0.005;

function normalizeOrderPayload(data) {
  const type = String(data.type || '').toUpperCase();
  const price = Number(data.price);
  const amount = Number(data.amount);

  if (!['BUY', 'SELL'].includes(type)) {
    throw new Error('Tipo de ordem inválido');
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Preço deve ser maior que zero');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Quantidade deve ser maior que zero');
  }

  return {
    type,
    price: Number(price.toFixed(2)),
    amount: Number(amount.toFixed(8))
  };
}

export function getBuyReserve(price, amount) {
  return Number((price * amount * (1 + MAKER_FEE_RATE)).toFixed(2));
}

export async function createOrderService(userId, data) {
  const order = normalizeOrderPayload(data);
  const user = await findUserById(userId);

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const conn = await db.getConnection();
  let orderId;

  try {
    await conn.beginTransaction();

    const [lockedRows] = await conn.query(
      'SELECT * FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    const lockedUser = lockedRows[0];

    if (order.type === 'BUY') {
      const reserve = getBuyReserve(order.price, order.amount);

      if (lockedUser.usd_balance < reserve) {
        throw new Error('Saldo USD insuficiente');
      }

      await conn.query(
        `UPDATE users
          SET usd_balance = usd_balance - ?, reserved_usd = reserved_usd + ?
          WHERE id = ?`,
        [reserve, reserve, userId]
      );
    } else {
      if (lockedUser.btc_balance < order.amount) {
        throw new Error('Saldo BTC insuficiente');
      }

      await conn.query(
        `UPDATE users
          SET btc_balance = btc_balance - ?, reserved_btc = reserved_btc + ?
          WHERE id = ?`,
        [order.amount, order.amount, userId]
      );
    }

    orderId = await orderRepository.createOrder(conn, {
      userId,
      ...order
    });

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  await redis.rpush(ORDER_QUEUE, String(orderId));
  await publishMarketUpdate({ orderId });

  return orderId;
}

export async function cancelOrderService(userId, orderId) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const order = await orderRepository.cancelOrder(conn, orderId, userId);

    if (!order) {
      throw new Error('Ordem ativa não encontrada');
    }

    if (order.type === 'BUY') {
      const reserve = getBuyReserve(order.price, order.remaining_amount);

      await conn.query(
        `UPDATE users
          SET usd_balance = usd_balance + ?, reserved_usd = GREATEST(reserved_usd - ?, 0)
          WHERE id = ?`,
        [reserve, reserve, userId]
      );
    } else {
      await conn.query(
        `UPDATE users
          SET btc_balance = btc_balance + ?, reserved_btc = GREATEST(reserved_btc - ?, 0)
          WHERE id = ?`,
        [order.remaining_amount, order.remaining_amount, userId]
      );
    }

    await conn.commit();
    await publishMarketUpdate({ orderId: Number(orderId) });

    return order;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function getActiveOrdersService(userId) {
  return orderRepository.getUserActiveOrders(userId);
}
