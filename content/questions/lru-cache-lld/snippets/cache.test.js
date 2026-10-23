import { test, expect } from 'vitest';
import { Cache } from './cache.js';
import { FifoPolicy, LruPolicy } from './policies.js';

const fill = (c, ...keys) => keys.forEach((k, i) => c.put(k, i));

test('evicts the least recently used key', () => {
  const c = new Cache({ capacity: 2 });
  fill(c, 'a', 'b');
  c.get('a');                                     // a is now newer than b
  c.put('c', 9);
  expect(c.get('b')).toBeUndefined();
  expect([c.get('a'), c.get('c')]).toEqual([0, 9]);
});

test('updating an existing key refreshes it and never evicts', () => {
  const c = new Cache({ capacity: 2 });
  fill(c, 'a', 'b');
  c.put('a', 10);
  expect(c.size).toBe(2);
  c.put('c', 1);                                  // b is the oldest now
  expect(c.get('b')).toBeUndefined();
  expect(c.get('a')).toBe(10);
});

test('capacity 1 keeps only the latest key', () => {
  const c = new Cache({ capacity: 1 });
  fill(c, 'a', 'b');
  expect([c.get('a'), c.get('b'), c.size]).toEqual([undefined, 1, 1]);
});

test('FIFO ignores reads, so the same sequence evicts a different key', () => {
  const c = new Cache({ capacity: 2, policy: new FifoPolicy() });
  fill(c, 'a', 'b');
  c.get('a');
  c.put('c', 9);
  expect(c.get('a')).toBeUndefined();             // LRU would have kept a
  expect(c.get('b')).toBe(1);
});

test('delete frees a slot and leaves no ghost in the policy', () => {
  const c = new Cache({ capacity: 2 });
  fill(c, 'a', 'b');
  expect(c.delete('a')).toBe(true);
  expect(c.delete('a')).toBe(false);
  fill(c, 'c');                                   // fits without evicting
  c.put('d', 3);                                  // now b is the oldest
  expect(c.get('b')).toBeUndefined();
  expect(c.size).toBe(2);
});

test('an entry expires exactly at its deadline (injected clock)', () => {
  let t = 1000;
  const c = new Cache({ capacity: 3, ttlMs: 100, now: () => t });
  c.put('a', 1);
  t = 1099;
  expect(c.get('a')).toBe(1);
  t = 1100;
  expect(c.get('a')).toBeUndefined();
  expect(c.size).toBe(0);
});

test('a per-key TTL overrides the default, and a hit does not extend it', () => {
  let t = 0;
  const c = new Cache({ capacity: 3, ttlMs: 100, now: () => t });
  c.put('short', 1, 10);
  c.put('long', 2);
  t = 50;
  expect(c.get('long')).toBe(2);
  expect(c.get('short')).toBeUndefined();
  t = 100;
  expect(c.get('long')).toBeUndefined();
});

test('listeners hear about evictions, expiries and deletes with the reason', () => {
  let t = 0;
  const c = new Cache({ capacity: 2, ttlMs: 50, now: () => t });
  const seen = [];
  c.onRemove((k, v, why) => seen.push(`${k}:${v}:${why}`));
  fill(c, 'a', 'b');
  c.put('c', 7);                                  // evicts a
  c.delete('b');
  t = 60;
  c.get('c');                                     // expired
  expect(seen).toEqual(['a:0:evicted', 'b:1:deleted', 'c:7:expired']);
});

test('stats count hits, misses and evictions', () => {
  const c = new Cache({ capacity: 1 });
  c.put('a', 1); c.get('a'); c.get('x'); c.put('b', 2);
  expect(c.stats).toEqual({ hits: 1, misses: 1, evictions: 1 });
});

test('rejects a capacity below 1', () => {
  expect(() => new Cache({ capacity: 0 })).toThrow(RangeError);
});

test('matches a simple Map-based model over 2,000 random operations', () => {
  let seed = 7;
  const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const c = new Cache({ capacity: 4 });
  const model = new Map();                        // a JS Map is already insertion-ordered: re-insert on use
  const touch = (k, v) => { model.delete(k); model.set(k, v); };
  for (let i = 0; i < 2000; i++) {
    const k = `k${rnd(9)}`;
    if (rnd(2)) {
      c.put(k, i);
      if (!model.has(k) && model.size === 4) model.delete(model.keys().next().value);
      touch(k, i);
    } else {
      const want = model.get(k);
      if (model.has(k)) touch(k, want);
      expect(c.get(k)).toBe(want);
    }
    expect(c.size).toBe(model.size);
  }
});
