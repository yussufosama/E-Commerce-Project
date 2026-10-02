import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { Product } from '../../database/model/product.model.js';
import { Order } from '../../database/model/order.model.js';
import { adminAnalytics } from './admin.analytics.js';

export function adminDashboardRoutes() {
  const router = Router();
  router.use(requireAuth, requireRole('admin'));
  router.get('/analytics', adminAnalytics);
  router.get('/shipping', (_req, res) => {
    const fee = process.env.SHIPPING_FEE_PIASTRES;
    res.json({ keyConfigured: Boolean(process.env.BOSTA_API_KEY?.trim()), pickupConfigured: Boolean(process.env.BOSTA_PICKUP_LOCATION_ID?.trim()), shippingConfigured: Boolean(fee?.trim()) && Number.isSafeInteger(Number(fee)) && Number(fee) >= 0 && Number(fee) <= 1000000 });
  });
  router.get('/', async (_req, res) => {
    const [products, activeProducts, lowStock, orders, recentOrders] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ active: true }),
      Product.aggregate([{ $match: { active: true } }, { $unwind: '$variants' }, { $match: { 'variants.stock': { $lte: 5 } } }, { $count: 'total' }]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, collected: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalPiastres', 0] } } } }]),
      Order.find().sort({ createdAt: -1, _id: -1 }).limit(5).select('_id createdAt status totalPiastres').lean(),
    ]);
    const ordersByStatus = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
    for (const entry of orders) ordersByStatus[entry._id] = entry.count;
    res.json({ products, activeProducts, lowStockVariants: lowStock[0]?.total || 0, ordersByStatus, collectedPiastres: orders.reduce((sum, entry) => sum + entry.collected, 0), recentOrders });
  });
  return router;
}
