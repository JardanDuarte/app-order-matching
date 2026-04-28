import { ORDER_QUEUE, createRedisClient } from '../config/redis.js';
import { processOrder } from '../services/matchingService.js';

const queue = createRedisClient();

export async function startMatchingEngine() {
  console.log('Matching worker aguardando ordens...');

  while (true) {
    const [, orderId] = await queue.blpop(ORDER_QUEUE, 0);

    try {
      await processOrder(Number(orderId));
    } catch (error) {
      console.error(`Falha ao processar ordem ${orderId}:`, error);
    }
  }
}
