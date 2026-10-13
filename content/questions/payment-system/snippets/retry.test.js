import { test, expect } from 'vitest';
import { backoffDelay, retry } from './retry.js';

test('the ceiling doubles each attempt until the cap', () => {
  const max = () => 0.999999; // just under the ceiling
  expect([0, 1, 2, 3, 4, 5, 6].map((a) => backoffDelay(a, { baseMs: 200, capMs: 10_000, rng: max }))).toEqual([199, 399, 799, 1599, 3199, 6399, 9999]);
  expect(backoffDelay(20, { rng: max })).toBe(9999); // capped, and no overflow
});

test('full jitter: any delay from 0 up to the ceiling', () => {
  expect(backoffDelay(3, { baseMs: 100, rng: () => 0 })).toBe(0);
  expect(backoffDelay(3, { baseMs: 100, rng: () => 0.5 })).toBe(400);
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1000; i++) {
    const d = backoffDelay(4, { baseMs: 100, rng });
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThan(1600);
  }
});

test('retries transient failures, then succeeds', async () => {
  const slept = [];
  let calls = 0;
  const result = await retry(
    async () => {
      if (++calls < 3) throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
      return 'ok';
    },
    { retries: 5, baseMs: 100, rng: () => 0.5, sleep: async (ms) => slept.push(ms) },
  );
  expect(result).toBe('ok');
  expect(calls).toBe(3);
  expect(slept).toEqual([50, 100]);
});

test('gives up after the last retry and rethrows', async () => {
  let calls = 0;
  const p = retry(
    async () => {
      calls++;
      throw new Error('PSP 503');
    },
    { retries: 2, sleep: async () => {} },
  );
  await expect(p).rejects.toThrow('PSP 503');
  expect(calls).toBe(3); // the first try plus two retries
});

test('a definite answer is never retried', async () => {
  let calls = 0;
  const declined = Object.assign(new Error('card_declined'), { status: 402 });
  const p = retry(
    async () => {
      calls++;
      throw declined;
    },
    { retries: 5, isRetryable: (e) => !e.status || e.status >= 500, sleep: async () => {} },
  );
  await expect(p).rejects.toBe(declined);
  expect(calls).toBe(1);
});
