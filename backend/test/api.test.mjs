import assert from 'assert';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { request } from './helpers/httpClient.mjs';

function bearerToken(user = { id: 1, username: 'tester' }) {
  return `Bearer ${jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
}

test('GET /health returns API health status', async () => {
  const res = await request(app, { path: '/health' });

  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { status: 'ok' });
});

test('POST /auth/login rejects requests without username', async () => {
  const res = await request(app, {
    path: '/auth/login',
    method: 'POST',
    body: {}
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Username é obrigatório');
});

test('GET /orders requires bearer token', async () => {
  const res = await request(app, { path: '/orders' });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Token não fornecido');
});

test('GET /market/my-trades requires bearer token', async () => {
  const res = await request(app, { path: '/market/my-trades' });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Token não fornecido');
});

test('POST /orders validates order type before touching persistence', async () => {
  const res = await request(app, {
    path: '/orders',
    method: 'POST',
    headers: { Authorization: bearerToken() },
    body: { type: 'INVALID', price: 100, amount: 1 }
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Tipo de ordem inválido');
});

test('POST /orders validates positive price before touching persistence', async () => {
  const res = await request(app, {
    path: '/orders',
    method: 'POST',
    headers: { Authorization: bearerToken() },
    body: { type: 'BUY', price: 0, amount: 1 }
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Preço deve ser maior que zero');
});

test('POST /orders validates positive amount before touching persistence', async () => {
  const res = await request(app, {
    path: '/orders',
    method: 'POST',
    headers: { Authorization: bearerToken() },
    body: { type: 'SELL', price: 100, amount: 0 }
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Quantidade deve ser maior que zero');
});
