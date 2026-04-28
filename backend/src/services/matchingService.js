import { db } from '../config/db.js';
import * as orderRepository from '../repositories/orderRepository.js';
import { createTrade } from '../repositories/tradeRepository.js';
import { getBuyReserve } from './orderService.js';
import { publishMarketUpdate } from './marketEventService.js';

const MAKER_FEE_RATE = 0.005;
const TAKER_FEE_RATE = 0.003;
const DECIMAL_EPSILON = 0.00000001;

function roundBtc(value) {
  return Number(Number(value).toFixed(8));
}

function roundUsd(value) {
  return Number(Number(value).toFixed(2));
}

async function creditBuyer(conn, buyOrder, amount, executionPrice, feeRate) {
  const grossTotal = roundUsd(amount * executionPrice);
  const fee = roundUsd(grossTotal * feeRate);
  const reservedSlice = getBuyReserve(buyOrder.price, amount);
  const refund = roundUsd(reservedSlice - grossTotal - fee);

  await conn.query(
    `UPDATE users
      SET btc_balance = btc_balance + ?,
          reserved_usd = GREATEST(reserved_usd - ?, 0),
          usd_balance = usd_balance + ?
      WHERE id = ?`,
    [amount, reservedSlice, Math.max(refund, 0), buyOrder.user_id]
  );

  return fee;
}

async function creditSeller(conn, sellOrder, amount, executionPrice, feeRate) {
  const grossTotal = roundUsd(amount * executionPrice);
  const fee = roundUsd(grossTotal * feeRate);

  await conn.query(
    `UPDATE users
      SET reserved_btc = GREATEST(reserved_btc - ?, 0),
          usd_balance = usd_balance + ?
      WHERE id = ?`,
    [amount, roundUsd(grossTotal - fee), sellOrder.user_id]
  );

  return fee;
}

async function executeMatch(conn, takerOrder, makerOrder, amount) {
  const price = makerOrder.price;
  const buyOrder = takerOrder.type === 'BUY' ? takerOrder : makerOrder;
  const sellOrder = takerOrder.type === 'SELL' ? takerOrder : makerOrder;

  const buyFeeRate = buyOrder.id === takerOrder.id ? TAKER_FEE_RATE : MAKER_FEE_RATE;
  const sellFeeRate = sellOrder.id === takerOrder.id ? TAKER_FEE_RATE : MAKER_FEE_RATE;

  const buyerFee = await creditBuyer(conn, buyOrder, amount, price, buyFeeRate);
  const sellerFee = await creditSeller(conn, sellOrder, amount, price, sellFeeRate);

  await createTrade(conn, {
    buyOrderId: buyOrder.id,
    sellOrderId: sellOrder.id,
    makerOrderId: makerOrder.id,
    takerOrderId: takerOrder.id,
    price,
    amount,
    makerFee: makerOrder.type === 'BUY' ? buyerFee : sellerFee,
    takerFee: takerOrder.type === 'BUY' ? buyerFee : sellerFee
  });

  makerOrder.remaining_amount = roundBtc(makerOrder.remaining_amount - amount);
  takerOrder.remaining_amount = roundBtc(takerOrder.remaining_amount - amount);

  await orderRepository.updateOrderRemaining(
    conn,
    makerOrder.id,
    makerOrder.remaining_amount,
    makerOrder.amount
  );
}

export async function processOrder(orderId) {
  const conn = await db.getConnection();
  let matched = false;
  let takerOrder;

  try {
    await conn.beginTransaction();

    takerOrder = await orderRepository.findOrderForUpdate(conn, orderId);

    if (!takerOrder || takerOrder.status !== 'QUEUED') {
      await conn.commit();
      return { skipped: true };
    }

    const makers = await orderRepository.findMatchingOrdersForUpdate(conn, takerOrder);

    for (const makerOrder of makers) {
      if (takerOrder.remaining_amount <= DECIMAL_EPSILON) break;

      const amount = roundBtc(Math.min(takerOrder.remaining_amount, makerOrder.remaining_amount));

      if (amount <= DECIMAL_EPSILON) continue;

      matched = true;
      await executeMatch(conn, takerOrder, makerOrder, amount);
    }

    const status = await orderRepository.updateOrderRemaining(
      conn,
      takerOrder.id,
      takerOrder.remaining_amount,
      takerOrder.amount
    );

    await conn.commit();

    await publishMarketUpdate({
      orderId: takerOrder.id,
      matched,
      status
    });

    return { matched, status };
  } catch (error) {
    await conn.rollback();
    console.error('Erro ao processar matching:', error);
    throw error;
  } finally {
    conn.release();
  }
}