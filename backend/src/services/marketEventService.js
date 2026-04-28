import { MARKET_EVENTS, redis, createRedisClient } from '../config/redis.js';

export async function publishMarketUpdate(payload = {}) {
  await redis.publish(MARKET_EVENTS, JSON.stringify({
    type: 'MARKET_UPDATED',
    payload,
    timestamp: new Date().toISOString()
  }));
}

export async function subscribeMarketUpdates(onMessage) {
  const subscriber = createRedisClient();

  await subscriber.subscribe(MARKET_EVENTS);

  subscriber.on('message', (channel, message) => {
    if (channel !== MARKET_EVENTS) return;

    try {
      onMessage(JSON.parse(message));
    } catch (error) {
      console.error('Invalid market event payload:', error);
    }
  });

  return subscriber;
}
