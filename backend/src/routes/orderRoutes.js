import express from 'express';
import {
  cancelOrder,
  createOrder,
  getActiveOrders
} from '../controllers/orderController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getActiveOrders);
router.post('/', authMiddleware, createOrder);
router.delete('/:id', authMiddleware, cancelOrder);

export default router;
