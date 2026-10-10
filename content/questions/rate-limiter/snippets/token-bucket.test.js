import { test, expect } from 'vitest';
import { TokenBucket } from './token-bucket.js';

test('bursts up to capacity, then refills at the rate', () => {
  let now = 0;
  const bucket = new TokenBucket({ ratePerSec: 2, capacity: 3, now: () => now });
  expect([bucket.take(), bucket.take(), bucket.take()].every(r => r.ok)).toBe(true);
  expect(bucket.take()).toEqual({ ok: false, remaining: 0, retryAfterMs: 500 });   // 1 token at 2/s
  now = 500;
  expect(bucket.take().ok).toBe(true);
});

test('an idle bucket never holds more than its capacity', () => {
  let now = 0;
  const bucket = new TokenBucket({ ratePerSec: 5, capacity: 20, now: () => now });
  for (let i = 0; i < 20; i++) bucket.take();
  now = 3_600_000;                                                        // an hour idle would be 18,000 tokens uncapped
  const results = Array.from({ length: 21 }, () => bucket.take());
  expect(results.filter(r => r.ok)).toHaveLength(20);
  expect(results[20]).toEqual({ ok: false, remaining: 0, retryAfterMs: 200 });   // 1 token at 5/s
});

test('retry delay comes from the token deficit, not a constant', () => {
  let now = 0;
  const bucket = new TokenBucket({ ratePerSec: 0.1, capacity: 5, now: () => now });   // login: 1 attempt per 10 s, burst 5
  for (let i = 0; i < 5; i++) expect(bucket.take().ok).toBe(true);
  expect(bucket.take().retryAfterMs).toBe(10_000);
  now = 4_000;                                                            // 0.4 tokens refilled
  expect(bucket.take().retryAfterMs).toBe(6_000);
});
