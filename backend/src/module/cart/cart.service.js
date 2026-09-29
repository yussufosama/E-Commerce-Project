import { Cart } from '../../database/model/cart.model.js';
import { Product } from '../../database/model/product.model.js';
import { sizes } from '../../database/model/product.model.js';
import { fail, objectBody, validId } from '../../utils/http-error.js';

export async function read(user) {
  const cart = await Cart.findOne({ user }).populate('items.product');
  const items = (cart?.items || []).map(item => {
    const p = item.product;
    const variant = p?.variants.find(v => v.size === item.size && v.color === item.color);
    return { productId: p?._id || null, name: p?.name || 'Unavailable', size: item.size, color: item.color, quantity: item.quantity,
      available: Boolean(p?.active && variant && variant.stock >= item.quantity), pricePiastres: p?.pricePiastres ?? null,
      subtotalPiastres: p ? p.pricePiastres * item.quantity : 0 };
  });
  return { items, currency: 'EGP', subtotalPiastres: items.reduce((sum, item) => sum + item.subtotalPiastres, 0) };
}

export async function setItem(user, body) {
  if (!objectBody(body, ['productId', 'size', 'color', 'quantity']) || !validId(body.productId) || !sizes.includes(body.size)
    || typeof body.color !== 'string' || !body.color || body.color.length > 40 || !Number.isInteger(body.quantity) || body.quantity < 0 || body.quantity > 10) fail(400, 'Invalid cart item. Quantity must be 0–10; zero removes the item.');
  const product = await Product.findOne({ _id: body.productId, active: true });
  const variant = product?.variants.find(v => v.size === body.size && v.color === body.color);
  if (body.quantity > 0 && (!variant || variant.stock < body.quantity)) fail(409, 'Product variant unavailable or insufficient stock.');
  let cart = await Cart.findOne({ user });
  if (!cart) cart = new Cart({ user, items: [] });
  cart.items = cart.items.filter(item => !(item.product.toString() === body.productId.toLowerCase() && item.size === body.size && item.color === body.color));
  if (body.quantity > 0) cart.items.push({ product: body.productId, size: body.size, color: body.color, quantity: body.quantity });
  if (cart.items.length > 30) fail(400, 'Cart can contain at most 30 variants.');
  try { await cart.save(); }
  catch (error) { if (error.name === 'VersionError' || error.code === 11000) fail(409, 'Cart changed. Refresh and retry.'); throw error; }
  return read(user);
}

export async function clear(user) { await Cart.deleteOne({ user }); }
