import assert from 'assert';
import { findMatchingOrdersForUpdate } from '../src/repositories/orderRepository.js';

test('findMatchingOrdersForUpdate prevents matching existing orders from the same user', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [[]];
    }
  };

  await findMatchingOrdersForUpdate(conn, {
    type: 'BUY',
    price: 10000,
    user_id: 1
  });

  assert.deepStrictEqual(calls[0].params, [10000, 1]);
  assert.ok(calls[0].sql.includes('user_id <> ?'));
});
