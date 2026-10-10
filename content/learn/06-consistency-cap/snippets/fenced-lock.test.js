import { expect, test } from 'vitest';
import { acquire } from './fenced-lock.js';

// Just enough of a Redis client: INCR and SET … PX ttl NX, with a clock we control.
function fakeRedis() {
  let now = 0;
  const data = new Map();
  const live = (k) => {
    const e = data.get(k);
    return e && (e.expiresAt === undefined || e.expiresAt > now) ? e : undefined;
  };
  return {
    advance: (ms) => { now += ms; },
    async incr(k) {
      const v = (live(k)?.value ?? 0) + 1;
      data.set(k, { value: v });
      return v;
    },
    async set(k, value, px, ttlMs, nx) {
      if (nx === 'NX' && live(k)) return null;
      data.set(k, { value, expiresAt: now + ttlMs });
      return 'OK';
    },
  };
}

// Storage that remembers the highest token it has seen (the SQL's `fence <= $2` check).
function fencedStore() {
  let fence = 0;
  return {
    body: null,
    write(token, body) {
      if (token < fence) return false;
      fence = token;
      this.body = body;
      return true;
    },
  };
}

test('a paused client with an expired lease cannot overwrite the new holder', async () => {
  const redis = fakeRedis();
  const store = fencedStore();

  const t1 = await acquire(redis, 'file:7', 10_000);
  expect(t1).toBe(1);
  expect(await acquire(redis, 'file:7', 10_000)).toBeNull();     // held: nobody else gets it

  redis.advance(15_000);                                          // client 1 hits a 15 s GC pause; the lease expires
  const t2 = await acquire(redis, 'file:7', 10_000);
  expect(t2).toBeGreaterThan(t1);
  expect(store.write(t2, 'from client 2')).toBe(true);

  expect(store.write(t1, 'from client 1')).toBe(false);          // client 1 wakes up: rejected by the fence
  expect(store.body).toBe('from client 2');
});
