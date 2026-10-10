import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { underDailyCap } from './daily-cap.js';

// The snippet uses a global `redis` client; a Map-backed fake with INCR and EXPIRE is enough.
function fakeRedis() {
  const values = new Map();
  const ttls = new Map();
  return {
    values,
    ttls,
    async incr(key) {
      const n = (values.get(key) ?? 0) + 1;
      values.set(key, n);
      return n;
    },
    async expire(key, seconds) {
      ttls.set(key, seconds);
      return 1;
    },
  };
}

beforeEach(() => {
  globalThis.redis = fakeRedis();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-10T09:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  delete globalThis.redis;
});

test('allows 3 marketing pushes a day, then says no', async () => {
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await underDailyCap(42, 'marketing'));
  expect(results).toEqual([true, true, true, false, false]);
});

test('the counter is per user, per type and per (UTC) day, and expires after a day', async () => {
  await underDailyCap(42, 'marketing');
  await underDailyCap(7, 'marketing');
  await underDailyCap(42, 'digest');
  expect([...globalThis.redis.values.keys()]).toEqual([
    'cap:42:marketing:2026-10-10',
    'cap:7:marketing:2026-10-10',
    'cap:42:digest:2026-10-10',
  ]);
  expect(globalThis.redis.ttls.get('cap:42:marketing:2026-10-10')).toBe(86_400);

  vi.setSystemTime(new Date('2026-10-11T09:00:00Z'));          // a new day starts a new counter
  for (let i = 0; i < 3; i++) await underDailyCap(42, 'marketing');
  expect(await underDailyCap(42, 'marketing')).toBe(false);
  expect(globalThis.redis.values.get('cap:42:marketing:2026-10-11')).toBe(4);
});

test('the TTL is set only once, on the first increment', async () => {
  const spy = vi.spyOn(globalThis.redis, 'expire');
  for (let i = 0; i < 3; i++) await underDailyCap(42, 'marketing');
  expect(spy).toHaveBeenCalledTimes(1);
});

test('a custom cap', async () => {
  expect(await underDailyCap(42, 'digest', 1)).toBe(true);
  expect(await underDailyCap(42, 'digest', 1)).toBe(false);
});
