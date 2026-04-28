import assert from 'assert';
import { getBuyReserve } from '../src/services/orderService.js';

test('getBuyReserve includes 0.5% maker fee and rounds to cents', () => {
  assert.strictEqual(getBuyReserve(100, 2), 201);
  assert.strictEqual(getBuyReserve(123.45, 0.12345678), 15.32);
});
