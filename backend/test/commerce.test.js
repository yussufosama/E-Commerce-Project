import { before, after, beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { execFileSync } from 'node:child_process';
import { createApp } from '../src/app.js';
import { User } from '../src/database/model/user.model.js';
import { Session } from '../src/database/model/session.model.js';
import { Product } from '../src/database/model/product.model.js';
import { Cart } from '../src/database/model/cart.model.js';
import { Order } from '../src/database/model/order.model.js';
import { hashPassword } from '../src/module/user/password.js';
import { digest } from '../src/module/user/user.service.js';
import { cookieOptions } from '../src/middleware/auth.middleware.js';
import { getServerConfig } from '../src/config/env.js';
import { createRecoveryService } from '../src/module/user/recovery.service.js';
import { EmailJob } from '../src/database/model/email-job.model.js';

const dbName = `triple_seven_test_${randomUUID().replaceAll('-', '')}`;
const password = 'A long test passphrase 777!';
const address = { name: 'Test Customer', phone: '01012345678', governorate: 'Cairo', city: 'Cairo', street: '1 Test Street', country: 'EG' };
let server, base, user, other, admin, product, customerCookie, otherCookie, adminCookie, passwordHash;
const models = [User, Session, Product, Cart, Order, EmailJob];
before(async () => {
  if (!process.env.TEST_MONGODB_URI) throw new Error('Run npm test to start the isolated replica set.');
  process.env.SHIPPING_FEE_PIASTRES = '5000';
  process.env.APP_ORIGIN = 'http://127.0.0.1:5000';
  await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName, serverSelectionTimeoutMS: 5000 });
  await Promise.all(models.map(model => model.init()));
  passwordHash = await hashPassword(password);
});
beforeEach(async () => {
  await Promise.all(models.map(model => model.deleteMany({})));
  [user, other, admin] = await User.create([
    { name: 'Customer', email: 'customer@example.test', passwordHash, emailVerified: true },
    { name: 'Other', email: 'other@example.test', passwordHash, emailVerified: true },
    { name: 'Admin', email: 'admin@example.test', passwordHash, role: 'admin', emailVerified: true },
  ]);
  async function session(account) {
    const token = randomBytes(32).toString('hex');
    await Session.create({ user: account._id, tokenHash: digest(token), version: 0, expiresAt: new Date(Date.now() + 60000) });
    return `triple_seven_session=${token}`;
  }
  customerCookie = await session(user); otherCookie = await session(other); adminCookie = await session(admin);
  product = await Product.create({ name: 'Test Tee', slug: 'test-tee', description: 'Test product', category: 't-shirts', pricePiastres: 65000,
    variants: [{ size: 'M', color: 'Black', stock: 2 }] });
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => { if (server) await new Promise(resolve => server.close(resolve)); });
after(async () => {
  if (mongoose.connection.name === dbName && dbName.startsWith('triple_seven_test_')) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

async function request(url, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TripleSeven', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, cookie: response.headers.get('set-cookie'), headers: response.headers };
}
const cartItem = quantity => ({ productId: product._id.toString(), size: 'M', color: 'Black', quantity });
const checkoutBody = (subtotal = 65000) => ({ address, paymentMethod: 'cash_on_delivery', expectedSubtotalPiastres: subtotal, expectedTotalPiastres: subtotal + 5000 });
async function add(cookie = customerCookie, quantity = 1) {
  const result = await request('/api/cart/items', { method: 'PUT', cookie, body: cartItem(quantity) });
  assert.equal(result.status, 200);
}
async function checkout(cookie = customerCookie, key = randomUUID(), subtotal = 65000) {
  return request('/api/orders', { method: 'POST', cookie, headers: { 'Idempotency-Key': key }, body: checkoutBody(subtotal) });
}

test('order responses omit internal retry fields on create, replay and cancellation', async () => {
  await add();
  const key = randomUUID();
  const created = await checkout(customerCookie, key);
  assert.equal(created.status, 201);
  const replay = await checkout(customerCookie, key);
  const cancelled = await request(`/api/orders/${created.body.order._id}/cancel`, {
    method: 'POST', cookie: customerCookie, body: {},
  });
  assert.equal(replay.status, 201);
  assert.equal(cancelled.status, 200);
  for (const result of [created, replay, cancelled]) {
    for (const field of ['requestHash', 'idempotencyKey', '__v']) assert.equal(result.body.order[field], undefined);
  }
  const stored = await Order.findById(created.body.order._id);
  assert.equal(stored.idempotencyKey, key);
  assert.ok(stored.requestHash);
});

test('registration hashes passwords, normalizes email and never accepts role injection', async () => {
  const body = { name: 'New Customer', email: 'NEW@example.test', password };
  assert.equal((await request('/api/users/register', { method: 'POST', body: { ...body, role: 'admin' } })).status, 400);
  const result = await request('/api/users/register', { method: 'POST', body });
  assert.equal(result.status, 200);
  const stored = await User.findOne({ email: 'new@example.test' }).select('+passwordHash');
  assert.equal(stored.role, 'customer'); assert.notEqual(stored.passwordHash, password);
  assert.equal(result.cookie, null);
  assert.deepEqual((await request('/api/users/register', { method: 'POST', body })).body, result.body);
});
test('login returns safe profile and protected cookie; logout revokes server-side session', async () => {
  const result = await request('/api/users/login', { method: 'POST', body: { email: user.email, password } });
  assert.equal(result.status, 200);
  assert.match(result.cookie, /HttpOnly/); assert.match(result.cookie, /SameSite=Strict/);
  assert.equal(result.body.user.passwordHash, undefined);
  assert.equal(result.body.token, undefined);
  const cookie = result.cookie.split(';')[0];
  assert.equal((await request('/api/users/me', { cookie })).status, 200);
  assert.equal((await request('/api/users/logout', { method: 'POST', cookie, body: {} })).status, 204);
  assert.equal((await request('/api/users/me', { cookie })).status, 401);
});
test('bad password and nonexistent email have the same login response', async () => {
  const first = await request('/api/users/login', { method: 'POST', body: { email: user.email, password: 'incorrect password' } });
  const second = await request('/api/users/login', { method: 'POST', body: { email: 'missing@example.test', password: 'incorrect password' } });
  assert.equal(first.status, 401); assert.deepEqual(first.body, second.body);
});
test('expired sessions, forged cookies and anonymous users are rejected', async () => {
  await Session.updateMany({ user: user._id }, { expiresAt: new Date(0) });
  for (const cookie of [undefined, 'triple_seven_session=forged', customerCookie]) {
    assert.equal((await request('/api/users/me', { cookie })).status, 401);
  }
});
test('CSRF protection rejects foreign origins, missing custom headers and form bodies', async () => {
  assert.equal((await request('/api/users/logout', { method: 'POST', cookie: customerCookie, body: {}, headers: { Origin: 'https://evil.test' } })).status, 403);
  assert.equal((await request('/api/users/logout', { method: 'POST', cookie: customerCookie, body: {}, headers: { 'X-Requested-With': '' } })).status, 403);
  assert.equal((await request('/api/users/logout', { method: 'POST', cookie: customerCookie, body: {}, headers: { 'Content-Type': 'text/plain' } })).status, 403);
  assert.equal((await request('/api/users/me', { cookie: customerCookie })).status, 200);
});
test('authentication rate limiting blocks repeated attempts', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await request('/api/users/login', { method: 'POST', body: {} })).status, 400);
  assert.equal((await request('/api/users/login', { method: 'POST', body: {} })).status, 429);
});
test('password change revokes sessions and old password stops working', async () => {
  const nextPassword = 'A different test passphrase 888!';
  assert.equal((await request('/api/users/change-password', { method: 'POST', cookie: customerCookie, body: { currentPassword: password, newPassword: nextPassword } })).status, 204);
  assert.equal((await request('/api/users/me', { cookie: customerCookie })).status, 401);
  assert.equal((await request('/api/users/login', { method: 'POST', body: { email: user.email, password } })).status, 401);
  assert.equal((await request('/api/users/login', { method: 'POST', body: { email: user.email, password: nextPassword } })).status, 200);
});
test('logout-all invalidates a session that races in with an old version', async () => {
  assert.equal((await request('/api/users/logout-all', { method: 'POST', cookie: customerCookie, body: {} })).status, 204);
  const token = customerCookie.split('=')[1];
  await Session.create({ user: user._id, tokenHash: digest(token), version: 0, expiresAt: new Date(Date.now() + 60000) });
  assert.equal((await request('/api/users/me', { cookie: customerCookie })).status, 401);
});
test('only admin can create products, change inventory and archive', async () => {
  const body = { name: 'New Hoodie', slug: 'new-hoodie', description: 'Test', category: 'hoodies', pricePiastres: 100000, variants: [{ size: 'L', color: 'Blue', stock: 3 }] };
  assert.equal((await request('/api/admin/products', { method: 'POST', cookie: customerCookie, body })).status, 403);
  assert.equal((await request('/api/admin/products', { method: 'POST', body })).status, 401);
  const created = await request('/api/admin/products', { method: 'POST', cookie: adminCookie, body });
  assert.equal(created.status, 201);
  const id = created.body.product._id;
  assert.equal((await request(`/api/admin/products/${id}/inventory`, { method: 'PATCH', cookie: adminCookie, body: { size: 'L', color: 'Blue', adjustment: -4 } })).status, 409);
  assert.equal((await request(`/api/admin/products/${id}/inventory`, { method: 'PATCH', cookie: adminCookie, body: { size: 'L', color: 'Blue', adjustment: 2 } })).status, 200);
  assert.equal((await request(`/api/admin/products/${id}`, { method: 'DELETE', cookie: adminCookie, body: {} })).status, 200);
  assert.equal((await request('/api/products/new-hoodie')).status, 404);
});
test('product writes reject operators, type coercion, duplicate variants and invalid URLs', async () => {
  for (const body of [{ $set: { active: true } }, { pricePiastres: '12' }, { images: ['javascript:alert(1)'] }, { variants: [] }]) {
    assert.equal((await request(`/api/admin/products/${product._id}`, { method: 'PATCH', cookie: adminCookie, body })).status, 400);
  }
});
test('cart validates quantity and ownership; client cannot supply a price', async () => {
  assert.equal((await request('/api/cart/items', { method: 'PUT', cookie: customerCookie, body: { ...cartItem(1), pricePiastres: 1 } })).status, 400);
  assert.equal((await request('/api/cart/items', { method: 'PUT', cookie: customerCookie, body: cartItem(3) })).status, 409);
  await add();
  assert.equal((await request('/api/cart', { cookie: otherCookie })).body.items.length, 0);
  assert.equal((await request('/api/cart', { cookie: customerCookie })).body.subtotalPiastres, 65000);
  await add(customerCookie, 0);
  assert.equal((await request('/api/cart', { cookie: customerCookie })).body.items.length, 0);
});
test('checkout computes total, consumes stock once and retries return the same order', async () => {
  await add();
  const key = randomUUID();
  const result = await checkout(customerCookie, key);
  assert.equal(result.status, 201);
  assert.equal(result.body.order.totalPiastres, 70000);
  const retry = await checkout(customerCookie, key);
  assert.equal(retry.body.order._id, result.body.order._id);
  assert.equal((await Product.findById(product._id)).variants[0].stock, 1);
  assert.equal(await Order.countDocuments(), 1);
  assert.equal((await request('/api/cart', { cookie: customerCookie })).body.items.length, 0);
});
test('price changes roll back stock and preserve cart', async () => {
  await add();
  const result = await checkout(customerCookie, randomUUID(), 1);
  assert.equal(result.status, 409);
  assert.equal((await Product.findById(product._id)).variants[0].stock, 2);
  assert.equal(await Order.countDocuments(), 0);
  assert.equal((await Cart.findOne({ user: user._id })).items.length, 1);
});
test('two buyers cannot buy the same last item', async () => {
  await Product.updateOne({ _id: product._id }, { $set: { 'variants.0.stock': 1 } });
  await add(customerCookie); await add(otherCookie);
  const results = await Promise.all([checkout(customerCookie), checkout(otherCookie)]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  assert.equal((await Product.findById(product._id)).variants[0].stock, 0);
  assert.equal(await Order.countDocuments(), 1);
});
test('order ownership and cancellation restore stock exactly once', async () => {
  await add();
  const result = await checkout();
  const id = result.body.order._id;
  assert.equal((await request(`/api/orders/${id}`, { cookie: otherCookie })).status, 404);
  assert.equal((await request(`/api/orders/${id}/cancel`, { method: 'POST', cookie: otherCookie, body: {} })).status, 404);
  assert.equal((await request(`/api/orders/${id}/cancel`, { method: 'POST', cookie: customerCookie, body: {} })).status, 200);
  assert.equal((await request(`/api/orders/${id}/cancel`, { method: 'POST', cookie: customerCookie, body: {} })).status, 403);
  assert.equal((await Product.findById(product._id)).variants[0].stock, 2);
});
test('admin order transitions require the correct sequence', async () => {
  await add();
  const id = (await checkout()).body.order._id;
  const status = value => request(`/api/admin/orders/${id}/status`, { method: 'PATCH', cookie: adminCookie, body: { status: value } });
  assert.equal((await status('delivered')).status, 409);
  for (const state of ['confirmed', 'shipped', 'delivered']) assert.equal((await status(state)).status, 200);
  assert.equal((await Order.findById(id)).paymentStatus, 'paid');
  assert.equal((await status('cancelled')).status, 409);
});
test('production requires HTTPS origin and cookie flags are HttpOnly and strict', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try { assert.throws(() => getServerConfig(), /HTTPS/); }
  finally { process.env.NODE_ENV = previous; }
  assert.equal(cookieOptions.httpOnly, true); assert.equal(cookieOptions.sameSite, 'strict');
  const production = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', 'import {cookieOptions,sessionCookie} from "./src/middleware/auth.middleware.js"; console.log(JSON.stringify({cookieOptions,sessionCookie}));'], {
    env: { ...process.env, NODE_ENV: 'production' }, encoding: 'utf8', windowsHide: true,
  }));
  assert.equal(production.cookieOptions.secure, true);
  assert.equal(production.sessionCookie, '__Host-triple_seven_session');
});

test('simultaneous checkout retries create exactly one order', async () => {
  await add();
  const key = randomUUID();
  const results = await Promise.all([checkout(customerCookie, key), checkout(customerCookie, key)]);
  assert.deepEqual(results.map(result => result.status), [201, 201]);
  assert.equal(results[0].body.order._id, results[1].body.order._id);
  assert.equal(await Order.countDocuments(), 1);
  assert.equal((await Product.findById(product._id)).variants[0].stock, 1);
});
test('failed multi-item checkout rolls back earlier stock deductions', async () => {
  await add();
  const unavailable = await Product.create({ name: 'Other Tee', slug: 'other-tee', description: 'Test', category: 't-shirts', pricePiastres: 100,
    variants: [{ size: 'M', color: 'Black', stock: 1 }] });
  assert.equal((await request('/api/cart/items', { method: 'PUT', cookie: customerCookie, body: { productId: unavailable._id.toString(), size: 'M', color: 'Black', quantity: 1 } })).status, 200);
  await Product.updateOne({ _id: unavailable._id }, { active: false });
  assert.equal((await checkout(customerCookie, randomUUID(), 65100)).status, 409);
  assert.equal((await Product.findById(product._id)).variants[0].stock, 2);
  assert.equal((await Cart.findOne({ user: user._id })).items.length, 2);
});
test('checkout quote includes shipping and fee changes require reconfirmation', async () => {
  await add();
  const quote = await request('/api/orders/quote', { cookie: customerCookie });
  assert.equal(quote.body.totalPiastres, 70000); assert.equal(quote.body.canCheckout, true);
  process.env.SHIPPING_FEE_PIASTRES = '6000';
  try { assert.equal((await checkout()).status, 409); }
  finally { process.env.SHIPPING_FEE_PIASTRES = '5000'; }
  assert.equal((await Product.findById(product._id)).variants[0].stock, 2);
});
test('missing shipping configuration blocks checkout without losing cart or stock', async () => {
  await add();
  delete process.env.SHIPPING_FEE_PIASTRES;
  try { assert.equal((await checkout()).status, 409); }
  finally { process.env.SHIPPING_FEE_PIASTRES = '5000'; }
  assert.equal((await Product.findById(product._id)).variants[0].stock, 2);
});
test('reusing an idempotency key with a changed address is rejected', async () => {
  await add();
  const key = randomUUID(); await checkout(customerCookie, key);
  const body = checkoutBody(); body.address = { ...address, street: 'Different Street' };
  const result = await request('/api/orders', { method: 'POST', cookie: customerCookie, body, headers: { 'Idempotency-Key': key } });
  assert.equal(result.status, 409);
});
test('oversized requests and operator-shaped login values are rejected', async () => {
  assert.equal((await request('/api/users/login', { method: 'POST', body: { email: { $ne: null }, password } })).status, 400);
  const large = await request('/api/users/register', { method: 'POST', body: { name: 'x'.repeat(30000), email: user.email, password } });
  assert.equal(large.status, 413); assert.deepEqual(large.body, { error: 'Request body is too large.' });
});
test('live role checks revoke admin permissions on existing sessions', async () => {
  assert.equal((await request('/api/admin/orders', { cookie: adminCookie })).status, 200);
  await User.updateOne({ _id: admin._id }, { role: 'customer' });
  assert.equal((await request('/api/admin/orders', { cookie: adminCookie })).status, 403);
});

test('unverified accounts cannot log in; verification tokens are hashed and single-use', async () => {
  await User.updateOne({ _id: user._id }, { emailVerified: false });
  assert.equal((await request('/api/users/login', { method: 'POST', body: { email: user.email, password } })).status, 403);
  const emails = [];
  const recovery = createRecoveryService({ configured: () => true, sendMail: async message => emails.push(message) });
  await recovery.requestEmail(user.email, 'verify');
  const token = emails[0].text.match(/verify-email=([a-f0-9]{64})/)[1];
  const stored = await User.findById(user._id).select('+verificationHash');
  assert.equal(stored.verificationHash, digest(token)); assert.notEqual(stored.verificationHash, token);
  assert.equal((await request('/api/users/verify-email', { method: 'POST', body: { token, newPassword: password } })).status, 200);
  assert.equal((await request('/api/users/verify-email', { method: 'POST', body: { token, newPassword: password } })).status, 400);
  assert.equal((await request('/api/users/me', { cookie: customerCookie })).status, 401);
  assert.equal((await request('/api/users/login', { method: 'POST', body: { email: user.email, password } })).status, 200);
});
test('password reset changes password, invalidates sessions and rejects token replay', async () => {
  const emails = [];
  const recovery = createRecoveryService({ configured: () => true, sendMail: async message => emails.push(message) });
  await recovery.requestEmail(user.email, 'reset');
  const token = emails[0].text.match(/reset-password=([a-f0-9]{64})/)[1];
  const body = { token, newPassword: 'A different recovery passphrase!' };
  assert.equal((await request('/api/users/reset-password', { method: 'POST', body })).status, 200);
  assert.equal((await request('/api/users/reset-password', { method: 'POST', body })).status, 400);
  assert.equal((await request('/api/users/me', { cookie: customerCookie })).status, 401);
  assert.equal((await request('/api/users/login', { method: 'POST', body: { email: user.email, password: body.newPassword } })).status, 200);
});
test('expired reset tokens and unknown accounts cannot change passwords', async () => {
  const emails = [];
  const recovery = createRecoveryService({ configured: () => true, sendMail: async message => emails.push(message) });
  await recovery.requestEmail('unknown@example.test', 'reset'); assert.equal(emails.length, 0);
  await recovery.requestEmail(user.email, 'reset');
  const token = emails[0].text.match(/reset-password=([a-f0-9]{64})/)[1];
  await User.updateOne({ _id: user._id }, { resetExpiresAt: new Date(0) });
  assert.equal((await request('/api/users/reset-password', { method: 'POST', body: { token, newPassword: password } })).status, 400);
});
test('email request endpoints queue indistinguishable work for known and unknown emails', async () => {
  const keys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'];
  const old = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  for (const key of keys) process.env[key] = 'test-placeholder';
  try {
    const known = await request('/api/users/forgot-password', { method: 'POST', body: { email: user.email } });
    const unknown = await request('/api/users/forgot-password', { method: 'POST', body: { email: 'unknown@example.test' } });
    assert.equal(known.status, 202); assert.deepEqual(known.body, unknown.body);
    assert.equal(await EmailJob.countDocuments(), 2);
  } finally { for (const key of keys) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; } }
});
test('storefront is served with CSP and credentials files cannot be downloaded', async () => {
  const response = await fetch(base + '/');
  const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /Triple-Seven/);
  const bundle = html.match(/src="(\/assets\/[^\"]+\.js)"/);
  assert.ok(bundle, 'React production bundle is present');
  assert.equal((await fetch(base + bundle[1])).status, 200);
  const legacy = await fetch(base + '/shop.html', { redirect: 'manual' });
  assert.equal(legacy.status, 302); assert.equal(legacy.headers.get('location'), '/');
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal((await fetch(base + '/store.js')).status, 200);
});
