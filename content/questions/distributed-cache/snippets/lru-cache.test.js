import { test, expect } from 'vitest';
import { LruCache } from './lru-cache.js';

function clock(start = 0) {
  let t = start;
  const f = () => t;
  f.advance = (ms) => { t += ms; };
  return f;
}

test('evicts the least recently used entry when the byte budget is exceeded', () => {
  const c = new LruCache(3);
  c.set('a', 1); c.set('b', 2); c.set('c', 3);
  c.get('a');                                  // a is now the most recent; b is the oldest
  c.set('d', 4);                               // over budget: b goes
  expect(c.get('b')).toBeUndefined();
  expect([c.get('a'), c.get('c'), c.get('d')]).toEqual([1, 3, 4]);
  expect(c.stats.evictions).toBe(1);
});

test('entries expire after their TTL', () => {
  const now = clock();
  const c = new LruCache(10, { now });
  c.set('k', 'v', { ttlMs: 1000 });
  now.advance(999);
  expect(c.get('k')).toBe('v');
  now.advance(2);
  expect(c.get('k')).toBeUndefined();
  expect(c.stats.expired).toBe(1);
  expect(c.size).toBe(0);                      // the expired entry freed its space
});

test('size is counted in bytes, so one big value can push out several small ones', () => {
  const c = new LruCache(100);
  for (let i = 0; i < 10; i++) c.set(`s${i}`, i, { size: 10 });
  expect(c.bytes).toBe(100);
  c.set('big', 'x', { size: 50 });
  expect(c.size).toBe(6);                      // 5 small ones evicted for the big one
  expect(c.bytes).toBe(100);
});

test('overwriting a key replaces its size and refreshes its position', () => {
  const c = new LruCache(10);
  c.set('a', 1, { size: 4 }); c.set('b', 2, { size: 4 });
  c.set('a', 9, { size: 6 });                  // a is now 6 bytes, most recent; total 10
  expect(c.bytes).toBe(10);
  c.set('c', 3, { size: 2 });                  // evicts b, the oldest
  expect(c.get('b')).toBeUndefined();
  expect(c.get('a')).toBe(9);
});

test('a value bigger than the whole cache is refused instead of emptying it', () => {
  const c = new LruCache(10);
  c.set('a', 1, { size: 5 });
  expect(c.set('huge', 'x', { size: 11 })).toBe(false);
  expect(c.get('a')).toBe(1);
});

test('hit ratio on a skewed workload: a cache of 10 keys serving a hot set of 8 hits over 90%', () => {
  const c = new LruCache(10);
  let s = 7;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  for (let i = 0; i < 20_000; i++) {
    const key = rnd() < 0.99 ? `hot${Math.floor(rnd() * 8)}` : `cold${Math.floor(rnd() * 100_000)}`;
    if (c.get(key) === undefined) c.set(key, 1);
  }
  expect(c.hitRatio()).toBeGreaterThan(0.9);
});
