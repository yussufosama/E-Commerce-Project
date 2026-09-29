import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import * as controller from './order.controller.js';
export function orderRoutes() {
  const router = Router();
  router.use(requireAuth);
  router.post('/', controller.checkout);
  router.get('/', controller.list);
  router.get('/quote', controller.quote);
  router.get('/:id', controller.get);
  router.post('/:id/cancel', controller.cancel);
  return router;
}
export function adminOrderRoutes() {
  const router = Router();
  router.use(requireAuth, requireRole('admin'));
  router.get('/', controller.adminList);
  router.get('/:id', controller.adminGet);
  router.patch('/:id/status', controller.adminUpdate);
  return router;
}
