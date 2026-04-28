import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null
};

export const ORDER_QUEUE = 'orders:queue';
export const MARKET_EVENTS = 'market:events';

const testRedis = {
  async rpush() {
    return 0;
  },
  async publish() {
    return 0;
  },
  async subscribe() {
    return 0;
  },
  on() {
    return this;
  },
  async quit() {
    return 'OK';
  }
};

export function createRedisClient() {
  if (process.env.NODE_ENV === 'test') {
    return testRedis;
  }

  return new Redis(redisOptions);
}

export const redis = createRedisClient();
