import { ORDER_QUEUE, createRedisClient } from '../config/redis.js';
import { processOrder } from '../services/matchingService.js';

const queue = createRedisClient();
const matchingDelayMs = Number(process.env.MATCHING_DELAY_MS || 0);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function startMatchingEngine() {
  console.log('Matching worker aguardando ordens...');

  while (true) {
    const [, orderId] = await queue.blpop(ORDER_QUEUE, 0);

    try {
      if (matchingDelayMs > 0) {
        await sleep(matchingDelayMs);
      }

      await processOrder(Number(orderId));
    } catch (error) {
      console.error(`Falha ao processar ordem ${orderId}:`, error);
    }
  }
}
