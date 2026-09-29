import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDatabase } from './database/connection.js';
import { getServerConfig } from './config/env.js';
import { User } from './database/model/user.model.js';
import { Session } from './database/model/session.model.js';
import { Cart } from './database/model/cart.model.js';
import { Order } from './database/model/order.model.js';
import { EmailJob } from './database/model/email-job.model.js';
import { Product } from './database/model/product.model.js';
import { startEmailWorker } from './module/user/email.worker.js';
import { mailConfigured } from './config/mail.js';

let server;
let stopEmailWorker;
try {
  const { port, host } = getServerConfig();
  console.log('Connecting to MongoDB...');
  await connectDatabase();
  await Promise.all([User.init(), Session.init(), Product.init(), Cart.init(), Order.init(), EmailJob.init()]);
  console.log(`Database connected: ${mongoose.connection.name}`);
  server = createApp().listen(port, host, () => {
    stopEmailWorker = startEmailWorker();
    const address = `http://${host.includes(':') ? `[${host}]` : host}:${port}`;
    console.log(`Server running: ${address}`);
    console.log(`Products API: ${address}/api/products`);
    console.log('Press Ctrl+C to stop the server.');
    if (!process.env.SHIPPING_FEE_PIASTRES?.trim()) console.log('Checkout awaits SHIPPING_FEE_PIASTRES in .env (integer piastres).');
    if (!mailConfigured()) console.log('Email verification/recovery awaits SMTP settings and APP_ORIGIN in .env.');
  });
  server.on('error', async () => {
    console.error('Server could not listen. Check HOST and PORT or whether the port is already in use.');
    await mongoose.disconnect();
    process.exitCode = 1;
  });
} catch (error) {
  console.error(error.name === 'MongooseServerSelectionError'
    ? 'MongoDB connection failed. Check MONGODB_URI, database availability, and network access.'
    : error.name === 'Error' ? error.message : 'Database setup failed. Check MONGODB_URI and credentials.');
  await mongoose.disconnect();
  process.exitCode = 1;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    if (!server) return;
    server.close(async () => {
      await stopEmailWorker?.();
      await mongoose.disconnect();
      clearTimeout(timeout);
    });
  });
}
