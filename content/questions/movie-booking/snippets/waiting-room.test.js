import { test, expect } from 'vitest';
import { joinQueue, admitBatch, isAdmitted } from './waiting-room.js';

// Just enough of ioredis for the waiting room, with the same reply types (scores come back as strings)
function fakeRedis() {
  const kv = new Map();
  const zsets = new Map();
  const zset = (k) => zsets.get(k) ?? zsets.set(k, new Map()).get(k);
  return {
    kv,
    async incr(k) { const v = Number(kv.get(k) ?? 0) + 1; kv.set(k, String(v)); return v; },
    async get(k) { return kv.get(k) ?? null; },
    async set(k, v) { kv.set(k, String(v)); return 'OK'; },
    async exists(k) { return kv.has(k) ? 1 : 0; },
    async zadd(k, flag, score, member) {
      const z = zset(k);
      if (flag === 'NX' && z.has(member)) return 0;
      z.set(member, Number(score));
      return 1;
    },
    async zscore(k, member) { const s = zset(k).get(member); return s === undefined ? null : String(s); },
    async zpopmin(k, count) {
      const z = zset(k);
      const lowest = [...z].sort((a, b) => a[1] - b[1]).slice(0, count);
      for (const [m] of lowest) z.delete(m);
      return lowest.flatMap(([m, s]) => [m, String(s)]);
    },
  };
}

test('users queue in arrival order and keep their place when they re-join', async () => {
  const redis = fakeRedis();
  expect(await joinQueue(redis, 42, 'alice')).toEqual({ position: 1 });
  expect(await joinQueue(redis, 42, 'bob')).toEqual({ position: 2 });
  expect(await joinQueue(redis, 42, 'carol')).toEqual({ position: 3 });
  expect(await joinQueue(redis, 42, 'bob')).toEqual({ position: 2 });   // a refresh doesn't send you to the back
});

test('each tick admits the next batch, and positions move up', async () => {
  const redis = fakeRedis();
  for (const u of ['alice', 'bob', 'carol', 'dave']) await joinQueue(redis, 42, u);

  await admitBatch(redis, 42, 2);
  expect(await isAdmitted(redis, 42, 'alice')).toBe(1);
  expect(await isAdmitted(redis, 42, 'bob')).toBe(1);
  expect(await isAdmitted(redis, 42, 'carol')).toBe(0);                // the booking API would reject carol for now
  expect(await joinQueue(redis, 42, 'carol')).toEqual({ position: 1 });
  expect(await joinQueue(redis, 42, 'dave')).toEqual({ position: 2 });

  await admitBatch(redis, 42, 2);
  expect(await isAdmitted(redis, 42, 'dave')).toBe(1);
});
