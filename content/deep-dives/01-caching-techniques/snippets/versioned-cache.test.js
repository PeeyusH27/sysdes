import { expect, test } from 'vitest';
import { VersionedCache } from './versioned-cache.js';

test('a normal fill is stored and read back', () => {
  const c = new VersionedCache();
  expect(c.fill('p:42', 10, 1)).toBe(true);
  expect(c.get('p:42')).toBe(10);
});

test('the slow reader cannot refill the old value after an invalidate', () => {
  const c = new VersionedCache();
  c.invalidate('p:42', 2);                              // writer set price 12 (row version 2) and invalidated
  expect(c.fill('p:42', 10, 1)).toBe(false);            // reader loaded version 1 before the write
  expect(c.get('p:42')).toBeUndefined();                // still a miss, so the next read loads the truth
});

test('a fresh reader can fill after the invalidate', () => {
  const c = new VersionedCache();
  c.invalidate('p:42', 2);
  expect(c.fill('p:42', 12, 2)).toBe(true);
  expect(c.get('p:42')).toBe(12);
});

test('an older invalidate never overrides a newer fill', () => {
  const c = new VersionedCache();
  c.fill('p:42', 12, 2);
  expect(c.invalidate('p:42', 1)).toBe(false);
  expect(c.get('p:42')).toBe(12);
});

test('a duplicate fill at the same version is ignored', () => {
  const c = new VersionedCache();
  c.fill('k', 'a', 3);
  expect(c.fill('k', 'b', 3)).toBe(false);
  expect(c.get('k')).toBe('a');
});
