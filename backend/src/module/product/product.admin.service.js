import { Product } from '../../database/model/product.model.js';
import { categories, sizes } from '../../database/model/product.model.js';
import { fail, objectBody, validId, pagination } from '../../utils/http-error.js';

function validate(body, partial = false) {
  const keys = ['name', 'slug', 'description', 'category', 'pricePiastres', 'images', 'variants', 'active'];
  if (!objectBody(body, keys) || !Object.keys(body).length) fail(400, 'Invalid product fields.');
  if (!partial && ['name', 'slug', 'description', 'category', 'pricePiastres', 'variants'].some(key => body[key] === undefined)) fail(400, 'Missing required product fields.');
  for (const [field, max] of [['name', 120], ['description', 3000], ['slug', 160]]) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || !body[field].trim() || body[field].length > max)) fail(400, `Invalid ${field}.`);
  }
  if (body.category !== undefined && !categories.includes(body.category)) fail(400, 'Invalid category.');
  if (body.pricePiastres !== undefined && (!Number.isSafeInteger(body.pricePiastres) || body.pricePiastres < 0 || body.pricePiastres > 100000000)) fail(400, 'Invalid pricePiastres.');
  if (body.active !== undefined && typeof body.active !== 'boolean') fail(400, 'Invalid active flag.');
  if (body.images !== undefined && (!Array.isArray(body.images) || body.images.length > 10 || body.images.some(url => {
    if (typeof url !== 'string' || url.length > 2048) return true;
    try { const parsed = new URL(url); return parsed.protocol !== 'https:' || !!parsed.username || !!parsed.password; } catch { return true; }
  }))) fail(400, 'Use up to ten HTTPS image URLs.');
  if (body.variants !== undefined && (!Array.isArray(body.variants) || !body.variants.length || body.variants.length > 100 || body.variants.some(v =>
    !objectBody(v, ['size', 'color', 'stock']) || !sizes.includes(v.size) || typeof v.color !== 'string' || !v.color.trim() || v.color.length > 40
    || !Number.isSafeInteger(v.stock) || v.stock < 0 || v.stock > 1000000))) fail(400, 'Invalid product variants.');
  return body;
}

export async function list(query) {
  const { page, limit } = pagination(query);
  const [products, total] = await Promise.all([Product.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select('-__v').lean(), Product.countDocuments()]);
  return { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
export async function create(body) { return Product.create(validate(body)); }
export async function update(id, body) {
  if (!validId(id)) fail(400, 'Invalid product ID.');
  validate(body, true);
  // Metadata changes and stock updates use targeted atomic writes, avoiding stale saves.
  // Variant identity is immutable after creation so outstanding orders can always restore stock.
  if (body.variants !== undefined) fail(400, 'Use the inventory endpoint to adjust existing variant stock.');
  const product = await Product.findByIdAndUpdate(id, { $set: body }, { returnDocument: 'after', runValidators: true });
  if (!product) fail(404, 'Product not found.');
  return product;
}
export async function inventory(id, body) {
  if (!validId(id) || !objectBody(body, ['size', 'color', 'adjustment']) || !sizes.includes(body.size) || typeof body.color !== 'string'
    || !Number.isSafeInteger(body.adjustment) || body.adjustment === 0 || Math.abs(body.adjustment) > 1000000) fail(400, 'Provide size, color and a nonzero integer adjustment.');
  const min = Math.max(0, -body.adjustment);
  const product = await Product.findOneAndUpdate({ _id: id, variants: { $elemMatch: { size: body.size, color: body.color, stock: { $gte: min, $lte: 1000000 - body.adjustment } } } },
    { $inc: { 'variants.$.stock': body.adjustment } }, { returnDocument: 'after' });
  if (!product) fail(409, 'Product variant missing or stock adjustment exceeds limits.');
  return product;
}
