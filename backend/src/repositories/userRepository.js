import { db } from '../config/db.js';

const INITIAL_USD = 100000;
const INITIAL_BTC = 100;

export async function findUserById(id) {
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
}

export async function findUserByUsername(username) {
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0];
}

export async function createUser(username) {
  const [result] = await db.query(
    `INSERT INTO users (username, usd_balance, btc_balance)
      VALUES (?, ?, ?)`,
    [username, INITIAL_USD, INITIAL_BTC]
  );

  return {
    id: result.insertId,
    username,
    usd_balance: INITIAL_USD,
    reserved_usd: 0,
    btc_balance: INITIAL_BTC,
    reserved_btc: 0
  };
}

export async function getUserBalance(userId) {
  const [rows] = await db.query(
    `SELECT usd_balance, reserved_usd, btc_balance, reserved_btc
      FROM users
      WHERE id = ?`,
    [userId]
  );

  return rows[0];
}
