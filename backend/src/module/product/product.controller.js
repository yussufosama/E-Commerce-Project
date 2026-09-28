import { categories } from '../../database/model/product.model.js';
import { isValidProductSlug, parseProductQuery } from './product.validation.js';

// Controllers translate HTTP input and service results into HTTP responses.
export function createProductController(productService) {
  async function listProducts(req, res) {
    const query = parseProductQuery(req.query);

    if (!query) {
      return res.status(400).json({
        error: 'Use page 1–10000, limit 1–48, and a valid category.',
        categories,
      });
    }

    const result = await productService.listProducts(query);
    res.json(result);
  }

  async function getProduct(req, res) {
    const { slug } = req.params;

    if (!isValidProductSlug(slug)) {
      return res.status(400).json({ error: 'Invalid product slug.' });
    }

    const product = await productService.getProductBySlug(slug);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({ product });
  }

  return { listProducts, getProduct };
}
