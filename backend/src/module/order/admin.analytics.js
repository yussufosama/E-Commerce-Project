import { Order } from '../../database/model/order.model.js';

const metrics = [{ $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: '$subtotalPiastres' }, collected: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalPiastres', 0] } } } }];
const normalize = rows => {
  const row = rows[0] || {};
  return { orders: row.orders || 0, sales: row.sales || 0, collected: row.collected || 0, average: row.orders ? Math.round(row.sales / row.orders) : 0 };
};

export async function adminAnalytics(req, res) {
  const raw = req.query.days ?? '30';
  if (Object.keys(req.query).some(key => key !== 'days') || typeof raw !== 'string' || !['7', '30', '90'].includes(raw)) return res.status(400).json({ error: 'Choose 7, 30 or 90 days.' });
  const days = Number(raw), day = 86400000;
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const start = new Date(end.getTime() - days * day);
  const previousStart = new Date(start.getTime() - days * day);
  const [result] = await Order.aggregate([
    { $match: { createdAt: { $gte: previousStart, $lt: end }, status: { $ne: 'cancelled' } } },
    { $facet: {
      current: [{ $match: { createdAt: { $gte: start } } }, ...metrics],
      previous: [{ $match: { createdAt: { $lt: start } } }, ...metrics],
      daily: [{ $match: { createdAt: { $gte: start } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, sales: { $sum: '$subtotalPiastres' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }],
      topProducts: [{ $match: { createdAt: { $gte: start } } }, { $sort: { createdAt: 1, _id: 1 } }, { $unwind: '$items' }, { $group: { _id: '$items.product', name: { $last: '$items.name' }, units: { $sum: '$items.quantity' }, sales: { $sum: { $multiply: ['$items.quantity', '$items.pricePiastres'] } } } }, { $sort: { sales: -1, _id: 1 } }, { $limit: 5 }],
    } },
  ]);
  const byDate = new Map(result.daily.map(row => [row._id, row]));
  const daily = Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() + i * day).toISOString().slice(0, 10);
    return { date, sales: byDate.get(date)?.sales || 0, orders: byDate.get(date)?.orders || 0 };
  });
  res.json({ days, start: start.toISOString(), end: end.toISOString(), timezone: 'UTC', current: normalize(result.current), previous: normalize(result.previous), daily, topProducts: result.topProducts });
}
