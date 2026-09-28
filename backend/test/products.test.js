import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Product } from '../src/database/model/product.model.js';

// A unique disposable database keeps tests away from the store's real catalog.
const databaseName = `triple_seven_test_${randomUUID().replaceAll('-', '')}`;
let server;
let base;
before(async () => {
  await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017', {
    dbName: databaseName, serverSelectionTimeoutMS: 5000,
  });
  await Product.init();
  await Product.create([
    { name: 'Test Tee', slug: 'test-tee', description: 'Test', category: 't-shirts', pricePiastres: 65000, variants: [{ size: 'M', color: 'Black', stock: 2 }] },
    { name: 'Hidden Tee', slug: 'hidden-tee', description: 'Test', category: 't-shirts', pricePiastres: 65000, variants: [{ size: 'M', color: 'Black', stock: 2 }], active: false },
  ]);
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName && databaseName.startsWith('triple_seven_test_')) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

test('health reports the live database connection', async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ready');
});
test('catalog returns active products with EGP integer prices and pagination', async () => {
  const response = await fetch(`${base}/api/products?category=t-shirts&limit=1`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.products.length, 1);
  assert.equal(body.products[0].slug, 'test-tee');
  assert.equal(body.products[0].currency, 'EGP');
  assert.equal(body.products[0].pricePiastres, 65000);
  assert.deepEqual(body.pagination, { page: 1, limit: 1, total: 1, pages: 1 });
});
test('detail endpoint finds a product and hides inactive products', async () => {
  assert.equal((await fetch(`${base}/api/products/test-tee`)).status, 200);
  assert.equal((await fetch(`${base}/api/products/hidden-tee`)).status, 404);
  assert.equal((await fetch(`${base}/api/products/missing`)).status, 404);
});
test('invalid pagination, repeated category and operator input are rejected', async () => {
  for (const query of ['page=-1', 'limit=49', 'page=1.5', 'category=unknown', 'category=hoodies&category=pants', 'category=%7B%22%24ne%22%3Anull%7D']) {
    assert.equal((await fetch(`${base}/api/products?${query}`)).status, 400, query);
  }
});
test('an out-of-range page returns an empty list', async () => {
  const body = await (await fetch(`${base}/api/products?page=2`)).json();
  assert.deepEqual(body.products, []);
});
test('money, stock and duplicate variants are validated before saving', async () => {
  const input = { name: 'Bad', slug: 'bad', description: 'Test', category: 't-shirts', pricePiastres: -1, variants: [{ size: 'M', color: 'Black', stock: 1.5 }] };
  await assert.rejects(new Product(input).validate(), { name: 'ValidationError' });
  await assert.rejects(new Product({ ...input, pricePiastres: 100, variants: [{ size: 'M', color: 'Black', stock: 1 }, { size: 'M', color: 'black', stock: 1 }] }).validate(), { name: 'ValidationError' });
});
test('unknown routes and malformed JSON produce readable errors', async () => {
  assert.equal((await fetch(`${base}/api/unknown`)).status, 404);
  const response = await fetch(`${base}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid JSON body.' });
});
test('database outage produces 503 instead of hanging', async () => {
  const unavailable = createApp({ databaseReady: () => false }).listen(0, '127.0.0.1');
  await new Promise(resolve => unavailable.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${unavailable.address().port}`;
    assert.equal((await fetch(`${url}/api/health`)).status, 503);
    assert.equal((await fetch(`${url}/api/products`)).status, 503);
  } finally {
    await new Promise(resolve => unavailable.close(resolve));
  }
});
