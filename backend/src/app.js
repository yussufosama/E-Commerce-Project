import express from 'express';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { protectBrowserWrites } from './middleware/auth.middleware.js';
import { adminProductRoutes } from './module/product/product.admin.routes.js';
import { cartRoutes } from './module/cart/cart.routes.js';
import { orderRoutes, adminOrderRoutes } from './module/order/order.routes.js';
import { userRoutes } from './module/user/user.routes.js';
import { Product } from './database/model/product.model.js';
import { getTrustedProxies } from './config/proxy.js';
import { productRoutes } from './module/product/product.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

export function createApp({ productModel = Product, databaseReady = () => mongoose.connection.readyState === 1 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', getTrustedProxies());
  app.use(helmet({ contentSecurityPolicy: { directives: { imgSrc: ["'self'", 'data:', 'https:'],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null } } }));
  app.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Too many requests. Try again shortly.' } }));
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());
  app.get('/shop.html', (_req, res) => res.redirect('/'));
  app.use(express.static(fileURLToPath(new URL('../frontend-dist/', import.meta.url)), { dotfiles: 'deny' }));
  app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url)), { dotfiles: 'deny', index: false }));
  app.get('/api/health', (_req, res) => {
    const ready = databaseReady();
    res.status(ready ? 200 : 503).json({ service: 'triple-seven-api', status: ready ? 'ready' : 'database-unavailable' });
  });
  app.use('/api', (_req, res, next) => {
    if (!databaseReady()) return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
    next();
  });
  app.use('/api/products', productRoutes(productModel));
  app.use('/api', protectBrowserWrites, (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/users', userRoutes());
  app.use('/api/cart', cartRoutes());
  app.use('/api/orders', orderRoutes());
  app.use('/api/admin/products', adminProductRoutes());
  app.use('/api/admin/orders', adminOrderRoutes());
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
