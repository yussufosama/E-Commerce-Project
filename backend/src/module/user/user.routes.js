import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import * as controller from './user.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as recovery from './recovery.controller.js';

export function userRoutes() {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Try again later.' } });
  const accountLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    keyGenerator: req => createHash('sha256').update(typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'invalid').digest('hex'),
    message: { error: 'Too many authentication attempts. Try again later.' } });
  router.post('/register', limiter, accountLimiter, controller.register);
  router.post('/login', limiter, accountLimiter, controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);
  router.post('/change-password', limiter, requireAuth, controller.changePassword);
  router.post('/logout-all', requireAuth, controller.logoutAll);
  router.post('/request-verification', limiter, accountLimiter, recovery.requestEmail('verify'));
  router.post('/forgot-password', limiter, accountLimiter, recovery.requestEmail('reset'));
  router.post('/verify-email', limiter, recovery.verify);
  router.post('/reset-password', limiter, recovery.reset);
  return router;
}
