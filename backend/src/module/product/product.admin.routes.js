import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import * as controller from './product.admin.controller.js';

export function adminProductRoutes() {
  const router = Router();
  router.use(requireAuth, requireRole('admin'));
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.patch('/:id/inventory', controller.inventory);
  router.delete('/:id', controller.archive);
  return router;
}
