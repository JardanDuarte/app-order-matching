import { startMatchingEngine } from './workers/matchingEngine.js';

startMatchingEngine().catch(error => {
  console.error('Worker encerrado por erro fatal:', error);
  process.exit(1);
});
