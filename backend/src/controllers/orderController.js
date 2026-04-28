import {
  cancelOrderService,
  createOrderService,
  getActiveOrdersService
} from '../services/orderService.js';

export async function createOrder(req, res) {
  try {
    const orderId = await createOrderService(req.user.id, req.body);

    return res.status(201).json({
      message: 'Ordem enviada para processamento',
      orderId
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getActiveOrders(req, res) {
  try {
    const orders = await getActiveOrdersService(req.user.id);
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar ordens ativas' });
  }
}

export async function cancelOrder(req, res) {
  try {
    await cancelOrderService(req.user.id, req.params.id);
    return res.json({ message: 'Ordem cancelada com sucesso' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
