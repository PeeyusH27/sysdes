import { expect, test } from 'vitest';
import { idempotency } from './idempotency.js';

// Just enough of ioredis for the middleware
function fakeRedis() {
  const data = new Map();
  return {
    async set(key, value, ...opts) {
      if (opts.includes('NX') && data.has(key)) return null;
      data.set(key, value);
      return 'OK';
    },
    async get(key) { return data.get(key) ?? null; },
    async del(key) { return data.delete(key) ? 1 : 0; },
  };
}

// Runs one request through the middleware and resolves with what the client receives
function request(mw, handler, key = 'key-1') {
  return new Promise((resolve) => {
    const req = { user: { id: 7 }, get: (h) => (h === 'Idempotency-Key' ? key : undefined) };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); return this; },
    };
    mw(req, res, () => handler(req, res));
  });
}

test('a retried POST replays the first response instead of charging twice', async () => {
  const mw = idempotency(fakeRedis());
  let charges = 0;
  const createOrder = (_req, res) => { charges++; res.status(201).json({ orderId: 123 }); };

  const first = await request(mw, createOrder);
  const retry = await request(mw, createOrder);
  expect(first).toEqual({ status: 201, body: { orderId: 123 } });
  expect(retry).toEqual(first);
  expect(charges).toBe(1);
});

test('a concurrent duplicate gets 409 while the first is still running', async () => {
  const mw = idempotency(fakeRedis());
  let finish;
  const slow = (_req, res) => { finish = () => res.status(201).json({ orderId: 1 }); };

  const first = request(mw, slow);
  await new Promise((r) => setTimeout(r, 0));         // let the first request claim the key
  const duplicate = await request(mw, () => { throw new Error('must not run'); });
  expect(duplicate.status).toBe(409);

  finish();
  expect((await first).status).toBe(201);
});

test('server errors release the key so the client can retry', async () => {
  const mw = idempotency(fakeRedis());
  let calls = 0;
  const flaky = (_req, res) => { calls++; calls === 1 ? res.status(503).json({ error: 'try again' }) : res.status(201).json({ ok: true }); };

  expect((await request(mw, flaky)).status).toBe(503);
  await new Promise((r) => setTimeout(r, 0));
  expect((await request(mw, flaky)).status).toBe(201);
  expect(calls).toBe(2);
});

test('requests without a key pass straight through', async () => {
  const mw = idempotency(fakeRedis());
  let calls = 0;
  const handler = (_req, res) => { calls++; res.json({ ok: true }); };
  await request(mw, handler, null);           // no Idempotency-Key header
  await request(mw, handler, null);           // no Idempotency-Key header
  expect(calls).toBe(2);
});
