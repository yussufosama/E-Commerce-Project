import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDatabase } from './database/connection.js';
import { getServerConfig } from './config/env.js';
import { User } from './database/model/user.model.js';
import { Session } from './database/model/session.model.js';

let server;
try {
  const { port, host } = getServerConfig();
  console.log('Connecting to MongoDB...');
  await connectDatabase();
  await Promise.all([User.init(), Session.init()]);
  console.log(`Database connected: ${mongoose.connection.name}`);
  server = createApp().listen(port, host, () => {
    const address = `http://${host.includes(':') ? `[${host}]` : host}:${port}`;
    console.log(`Server running: ${address}`);
    console.log(`Products API: ${address}/api/products`);
    console.log('Press Ctrl+C to stop the server.');
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
      await mongoose.disconnect();
      clearTimeout(timeout);
    });
  });
}
