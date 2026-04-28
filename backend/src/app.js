import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import marketRoutes from './routes/marketRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/orders', orderRoutes);
app.use('/market', marketRoutes);

export default app;
