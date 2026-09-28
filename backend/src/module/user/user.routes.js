import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from './user.controller.js';
import { requireAuth, protectBrowserWrites } from '../../middleware/auth.middleware.js';

export function userRoutes() {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Try again later.' } });
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(protectBrowserWrites);
  router.post('/register', limiter, controller.register);
  router.post('/login', limiter, controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);
  return router;
}
