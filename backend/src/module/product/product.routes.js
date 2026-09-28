import { Router } from 'express';
import { createProductController } from './product.controller.js';
import { createProductService } from './product.service.js';

export function productRoutes(productModel) {
  const router = Router();
  const service = createProductService(productModel);
  const controller = createProductController(service);

  router.get('/', controller.listProducts);
  router.get('/:slug', controller.getProduct);

  return router;
}
