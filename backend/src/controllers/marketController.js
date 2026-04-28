import * as marketService from '../services/marketService.js';

export async function getOrderBook(req, res) {
  try {
    const data = await marketService.getOrderBookService();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar orderbook' });
  }
}

export async function getTrades(req, res) {
  try {
    const data = await marketService.getTradesService();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar trades' });
  }
}

export async function getMyTrades(req, res) {
  try {
    const data = await marketService.getUserTradesService(req.user.id);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
}

export async function getStats(req, res) {
  try {
    const userId = req.user?.id;

    const data = await marketService.getStatsService(userId);

    return res.json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
}
