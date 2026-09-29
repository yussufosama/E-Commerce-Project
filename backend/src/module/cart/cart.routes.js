import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as controller from './cart.controller.js';
export function cartRoutes() {
  const router = Router();
  router.use(requireAuth);
  router.get('/', controller.read);
  router.put('/items', controller.setItem);
  router.delete('/', controller.clear);
  return router;
}
