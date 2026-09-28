import { Product } from '../../database/model/product.model.js';

// Services work with data, without depending on Express requests or responses.
export function createProductService(productModel = Product) {
  async function listProducts({ page, limit, category }) {
    const filter = { active: true, ...(category ? { category } : {}) };
    const [products, total] = await Promise.all([
      productModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-__v')
        .lean(),
      productModel.countDocuments(filter),
    ]);

    return { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async function getProductBySlug(slug) {
    return productModel.findOne({ slug, active: true }).select('-__v').lean();
  }

  return { listProducts, getProductBySlug };
}
