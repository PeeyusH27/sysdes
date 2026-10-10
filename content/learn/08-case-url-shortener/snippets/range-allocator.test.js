import { beforeEach, expect, test, vi } from 'vitest';

// A fake Redis with just INCRBY; the await makes the reply arrive asynchronously, like the real thing.
function fakeRedis() {
  let value = 0;
  return {
    calls: 0,
    async incrby(key, n) {
      this.calls++;
      await new Promise((r) => setTimeout(r, 1));
      value += n;
      return value;
    },
  };
}

// The allocator keeps its block in module state, so each test (and each "server") gets a fresh copy.
async function freshAllocator() {
  vi.resetModules();
  return (await import('./range-allocator.js')).nextId;
}

let nextId;
beforeEach(async () => {
  nextId = await freshAllocator();
});

test('hands out consecutive ids and asks Redis once per 1,000', async () => {
  const redis = fakeRedis();
  const ids = [];
  for (let i = 0; i < 1_001; i++) ids.push(await nextId(redis));
  expect(ids[0]).toBe(0);
  expect(ids[1_000]).toBe(1_000);
  expect(new Set(ids).size).toBe(1_001);
  expect(redis.calls).toBe(2);
});

test('concurrent callers share one refill instead of stampeding Redis', async () => {
  const redis = fakeRedis();
  const ids = await Promise.all(Array.from({ length: 2_500 }, () => nextId(redis)));
  expect(new Set(ids).size).toBe(2_500);
  expect(Math.max(...ids)).toBe(2_499);
  expect(redis.calls).toBe(3);                               // blocks [0,1000), [1000,2000), [2000,3000)
});

test('two app servers sharing one counter never hand out the same id', async () => {
  const redis = fakeRedis();
  const serverA = nextId;
  const serverB = await freshAllocator();
  const a = await Promise.all(Array.from({ length: 1_500 }, () => serverA(redis)));
  const b = await Promise.all(Array.from({ length: 1_500 }, () => serverB(redis)));
  expect(new Set([...a, ...b]).size).toBe(3_000);
});

test('a failed refill rejects the waiting callers, and the next call tries again', async () => {
  const redis = fakeRedis();
  const real = redis.incrby.bind(redis);
  redis.incrby = vi.fn().mockRejectedValueOnce(new Error('redis down')).mockImplementation(real);
  const first = await Promise.allSettled([nextId(redis), nextId(redis)]);
  expect(first.map((r) => r.status)).toEqual(['rejected', 'rejected']);
  expect(await nextId(redis)).toBe(0);
  expect(redis.incrby).toHaveBeenCalledTimes(2);
});
