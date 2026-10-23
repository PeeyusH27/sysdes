import { expect, test } from 'vitest';
import { LRUCache, LRUCacheMap } from './lru-cache.js';

for (const [name, Cache] of [['linked list', LRUCache], ['Map order', LRUCacheMap]]) {
  test(`${name}: evicts the least recently used key`, () => {
    const c = new Cache(2);
    c.put(1, 1);
    c.put(2, 2);
    expect(c.get(1)).toBe(1); // 1 is now the newest
    c.put(3, 3); // evicts 2
    expect(c.get(2)).toBe(-1);
    c.put(4, 4); // evicts 1
    expect(c.get(1)).toBe(-1);
    expect(c.get(3)).toBe(3);
    expect(c.get(4)).toBe(4);
  });

  test(`${name}: updating a key counts as a use and never grows the cache`, () => {
    const c = new Cache(2);
    c.put(2, 1);
    c.put(2, 2);
    expect(c.get(2)).toBe(2);
    c.put(1, 1);
    c.put(4, 1); // evicts 2
    expect(c.get(2)).toBe(-1);
    expect(c.get(1)).toBe(1);
  });

  test(`${name}: capacity 1 keeps only the newest key`, () => {
    const c = new Cache(1);
    c.put(1, 10);
    c.put(2, 20);
    expect(c.get(1)).toBe(-1);
    expect(c.get(2)).toBe(20);
  });
}
