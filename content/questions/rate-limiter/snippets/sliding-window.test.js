import { test, expect } from 'vitest';
import { slidingWindowAllow } from './sliding-window.js';

// Minimal in-memory stand-in for ioredis MULTI: exec() resolves to [error, result] pairs
function fakeRedis() {
  const store = new Map();
  return {
    multi() {
      const ops = [];
      const chain = {
        incr: (k) => (ops.push(() => { const v = Number(store.get(k) ?? 0) + 1; store.set(k, String(v)); return v; }), chain),
        get: (k) => (ops.push(() => store.get(k) ?? null), chain),
        pexpire: () => (ops.push(() => 1), chain),
        exec: async () => ops.map((op) => [null, op()]),
      };
      return chain;
    },
  };
}

test('the previous window still counts for the part that overlaps', async () => {
  const redis = fakeRedis();
  const allow = (t) => slidingWindowAllow(redis, 'user:7', 10, 60_000, t);

  for (let i = 0; i < 10; i++) expect(await allow(59_000)).toBe(true);   // 10 requests just before the edge
  // 15 s into the next window, the old window still weighs 75%: 10 × 0.75 = 7.5
  expect(await allow(75_000)).toBe(true);    // 7.5 + 1 = 8.5
  expect(await allow(75_000)).toBe(true);    // 7.5 + 2 = 9.5
  expect(await allow(75_000)).toBe(false);   // 7.5 + 3 = 10.5 > 10
  // A fixed window would have allowed 10 more here: 20 requests in 16 seconds.
});

test('a fresh key starts empty', async () => {
  const redis = fakeRedis();
  expect(await slidingWindowAllow(redis, 'k', 1, 1_000, 500)).toBe(true);
  expect(await slidingWindowAllow(redis, 'k', 1, 1_000, 600)).toBe(false);
});
