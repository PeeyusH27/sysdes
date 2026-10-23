import { expect, test } from 'vitest';
import { LFUCache } from './lfu-cache.js';

test('evicts the least frequently used key', () => {
  const c = new LFUCache(2);
  c.put(1, 1);
  c.put(2, 2);
  expect(c.get(1)).toBe(1); // 1 has 2 uses, 2 has 1
  c.put(3, 3); // evicts 2
  expect(c.get(2)).toBe(-1);
  expect(c.get(3)).toBe(3);
});

test('ties go to the least recently used key', () => {
  const c = new LFUCache(2);
  c.put(1, 1);
  c.put(2, 2);
  c.get(1);
  c.get(2); // both have 2 uses; 1 is older
  c.put(3, 3);
  expect(c.get(1)).toBe(-1);
  expect(c.get(2)).toBe(2);
  expect(c.get(3)).toBe(3);
});

test('capacity 0 stores nothing, and an evicted key restarts at one use', () => {
  const zero = new LFUCache(0);
  zero.put(0, 0);
  expect(zero.get(0)).toBe(-1);
  const c = new LFUCache(1);
  c.put(1, 1);
  c.get(1);
  c.put(2, 2); // evicts 1
  c.put(1, 5); // 1 comes back with a fresh count, so it evicts 2
  expect(c.get(2)).toBe(-1);
  expect(c.get(1)).toBe(5);
});
