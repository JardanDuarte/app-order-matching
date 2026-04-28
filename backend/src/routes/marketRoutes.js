import express from 'express';
import * as marketController from '../controllers/marketController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/orderbook', marketController.getOrderBook);
router.get('/trades', marketController.getTrades);
router.get('/my-trades', authMiddleware, marketController.getMyTrades);
router.get('/stats', authMiddleware, marketController.getStats);

export default router;
