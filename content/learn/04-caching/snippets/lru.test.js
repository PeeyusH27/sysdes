import { expect, test } from 'vitest';
import { LRU } from './lru.js';

test('evicts the least recently used key', () => {
  const cache = new LRU(2);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.get('a');                 // a is now the most recent
  cache.set('c', 3);              // evicts b
  expect(cache.get('b')).toBeUndefined();
  expect(cache.get('a')).toBe(1);
  expect(cache.get('c')).toBe(3);
});
