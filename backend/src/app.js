import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { userRoutes } from './module/user/user.routes.js';
import { Product } from './database/model/product.model.js';
import { productRoutes } from './module/product/product.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

export function createApp({ productModel = Product, databaseReady = () => mongoose.connection.readyState === 1 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());
  app.use('/api/users', (_req, res, next) => {
    if (!databaseReady()) return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
    next();
  }, userRoutes());
  app.get('/api/health', (_req, res) => {
    const ready = databaseReady();
    res.status(ready ? 200 : 503).json({ service: 'triple-seven-api', status: ready ? 'ready' : 'database-unavailable' });
  });
  app.use('/api/products', (_req, res, next) => {
    if (!databaseReady()) return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
    next();
  }, productRoutes(productModel));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
