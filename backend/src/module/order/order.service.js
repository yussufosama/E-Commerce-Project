import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { Order } from '../../database/model/order.model.js';
import { Cart } from '../../database/model/cart.model.js';
import { Product } from '../../database/model/product.model.js';
import { fail, pagination, validId, objectBody } from '../../utils/http-error.js';
import { checkoutInput } from './order.validation.js';
import { read as readCart } from '../cart/cart.service.js';

export async function quote(user) {
  const cart = await readCart(user);
  const shippingPiastres = shippingFee();
  return { ...cart, shippingPiastres, totalPiastres: cart.subtotalPiastres + shippingPiastres,
    canCheckout: cart.items.length > 0 && cart.items.every(item => item.available) };
}

export function shippingFee() {
  const value = Number(process.env.SHIPPING_FEE_PIASTRES);
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000000 || process.env.SHIPPING_FEE_PIASTRES === undefined || process.env.SHIPPING_FEE_PIASTRES.trim() === '') {
    fail(409, 'Checkout is not configured. Store owner must set SHIPPING_FEE_PIASTRES.');
  }
  return value;
}

export async function checkout(user, body, key) {
  const input = checkoutInput(body, key);
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const checkExisting = order => {
    if (order.requestHash !== requestHash) fail(409, 'Idempotency key was already used for a different request.');
    return order;
  };
  try {
    return await mongoose.connection.transaction(async session => {
      const existing = await Order.findOne({ user, idempotencyKey: key }).session(session);
      if (existing) return checkExisting(existing);
      const shippingPiastres = shippingFee();
      const cart = await Cart.findOne({ user }).session(session);
      if (!cart?.items.length) fail(409, 'Cart is empty.');
      const items = [];
      for (const item of cart.items) {
        const product = await Product.findOneAndUpdate({ _id: item.product, active: true,
          variants: { $elemMatch: { size: item.size, color: item.color, stock: { $gte: item.quantity } } } },
        { $inc: { 'variants.$.stock': -item.quantity } }, { session, returnDocument: 'after' });
        if (!product) fail(409, 'An item is unavailable or has insufficient stock. Refresh your cart.');
        items.push({ product: product._id, name: product.name, size: item.size, color: item.color, quantity: item.quantity, pricePiastres: product.pricePiastres });
      }
      const subtotalPiastres = items.reduce((sum, item) => sum + item.pricePiastres * item.quantity, 0);
      if (subtotalPiastres !== input.expectedSubtotalPiastres) fail(409, 'Prices changed. Refresh your cart before checking out.');
      if (subtotalPiastres + shippingPiastres !== input.expectedTotalPiastres) fail(409, 'Order total changed. Refresh the checkout quote.');
      const [order] = await Order.create([{ user, idempotencyKey: key, requestHash, items, address: input.address,
        subtotalPiastres, shippingPiastres, totalPiastres: subtotalPiastres + shippingPiastres }], { session });
      await Cart.deleteOne({ _id: cart._id }, { session });
      return order;
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Order.findOne({ user, idempotencyKey: key });
      if (existing) return checkExisting(existing);
    }
    throw error;
  }
}

export async function list(user, query, admin = false) {
  const { page, limit } = pagination(query);
  const filter = admin ? {} : { user };
  const [orders, total] = await Promise.all([Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select('-requestHash -idempotencyKey -__v').lean(), Order.countDocuments(filter)]);
  return { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function get(user, id, admin = false) {
  if (!validId(id)) fail(400, 'Invalid order ID.');
  const order = await Order.findOne({ _id: id, ...(admin ? {} : { user }) }).select('-requestHash -idempotencyKey -__v');
  if (!order) fail(404, 'Order not found.');
  return order;
}

export async function changeStatus(user, id, body, admin = false) {
  if (!validId(id) || !objectBody(body, ['status']) || typeof body.status !== 'string') fail(400, 'Provide an order ID and status.');
  return mongoose.connection.transaction(async session => {
    const order = await Order.findOne({ _id: id, ...(admin ? {} : { user }) }).session(session);
    if (!order) fail(404, 'Order not found.');
    const allowed = { pending: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
    if (!admin && !(order.status === 'pending' && body.status === 'cancelled')) fail(403, 'Customers can only cancel pending orders.');
    if (!allowed[order.status].includes(body.status)) fail(409, 'Invalid order status transition.');
    if (body.status === 'cancelled') {
      for (const item of order.items) {
        const result = await Product.updateOne({ _id: item.product, variants: { $elemMatch: { size: item.size, color: item.color } } },
          { $inc: { 'variants.$.stock': item.quantity } }, { session });
        if (result.matchedCount !== 1) fail(409, 'Cannot restore stock for a missing product variant.');
      }
    }
    order.status = body.status;
    if (body.status === 'delivered') order.paymentStatus = 'paid';
    await order.save({ session });
    return order;
  });
}
