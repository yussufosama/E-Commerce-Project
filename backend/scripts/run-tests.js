import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import mongoose from 'mongoose';

// Tests always use their own randomly named databases, never the application URI.
const root = path.resolve('.test-mongo');
let directory, daemon, client;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    await mkdir(root, { recursive: true });
    directory = await mkdtemp(path.join(root, 'run-'));
    const socket = net.createServer();
    await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
    const port = socket.address().port;
    await new Promise(resolve => socket.close(resolve));
    daemon = spawn(process.env.MONGOD_BINARY || 'mongod', ['--dbpath', directory, '--bind_ip', '127.0.0.1', '--port', String(port), '--replSet', 'tripleSevenTest', '--logpath', path.join(directory, 'mongo.log'), '--oplogSize', '32'], { windowsHide: true, stdio: 'ignore' });
    let launchError;
    daemon.on('error', error => { launchError = error; });
    const direct = `mongodb://127.0.0.1:${port}/?directConnection=true`;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (launchError) throw new Error('mongod is unavailable. Set MONGOD_BINARY or TEST_MONGODB_URI to a test replica set.');
      client = new mongoose.mongo.MongoClient(direct, { serverSelectionTimeoutMS: 500 });
      try { await client.connect(); break; } catch { await client.close(); client = null; await delay(300); }
    }
    if (!client) throw new Error('Test MongoDB did not start.');
    await client.db('admin').command({ replSetInitiate: { _id: 'tripleSevenTest', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
    for (let attempt = 0; attempt < 60; attempt++) {
      if ((await client.db('admin').command({ hello: 1 })).isWritablePrimary) break;
      if (attempt === 59) throw new Error('Test replica set was not ready.');
      await delay(300);
    }
    uri = `mongodb://127.0.0.1:${port}/?replicaSet=tripleSevenTest`;
  }
  console.log('Running tests against isolated test databases.');
  const run = spawn(process.execPath, ['--test', '--test-concurrency=1', 'test/products.test.js', 'test/commerce.test.js', 'test/proxy.test.js'], { stdio: 'inherit', windowsHide: true, env: { ...process.env, TEST_MONGODB_URI: uri, NODE_ENV: 'test', TRUSTED_PROXY_IPS: '' } });
  process.exitCode = await new Promise((resolve, reject) => { run.once('error', reject); run.once('exit', code => resolve(code ?? 1)); });
} catch (error) {
  console.error('Test setup failed:', error.message);
  process.exitCode = 1;
} finally {
  if (client) {
    try { await client.db('admin').command({ shutdown: 1, force: true }); } catch { /* Shutdown closes the connection. */ }
    await client.close();
  }
  if (daemon && daemon.exitCode === null) {
    await Promise.race([new Promise(resolve => daemon.once('exit', resolve)), delay(5000)]);
    if (daemon.exitCode === null) daemon.kill();
  }
  // Only remove the temporary directory this invocation created inside our test root.
  if (directory && path.dirname(path.resolve(directory)) === root) {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(() => console.log('Test files retained under .test-mongo.'));
  }
}
