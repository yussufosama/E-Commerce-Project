import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { getTrustedProxies } from '../src/config/proxy.js';

test('proxy configuration rejects blanket trust, hop counts and malformed addresses', () => {
  assert.equal(getTrustedProxies(''), false);
  for (const value of ['true', '1', '*', '0.0.0.0/0', '127.0.0.1,', 'proxy.example.com']) {
    assert.throws(() => getTrustedProxies(value), /TRUSTED_PROXY_IPS/);
  }
  assert.deepEqual(getTrustedProxies('127.0.0.1, ::1'), ['127.0.0.1', '::1']);
});

test('forwarded client IP is accepted only through a configured proxy', async () => {
  for (const [proxy, expected] of [['', '127.0.0.1'], ['192.0.2.1', '127.0.0.1'], ['127.0.0.1', '198.51.100.7']]) {
    const app = express();
    app.set('trust proxy', getTrustedProxies(proxy));
    app.get('/', (req, res) => res.json({ ip: req.ip }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/`, {
        headers: { 'X-Forwarded-For': '203.0.113.99, 198.51.100.7' },
      });
      assert.equal((await response.json()).ip, expected);
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
});
