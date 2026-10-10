import { expect, test } from 'vitest';
import { compare, tick } from './vector-clock.js';

test('detects causal order and concurrency', () => {
  expect(compare({ a: 1 }, { a: 1, b: 1 })).toBe('before');
  expect(compare({ a: 1, b: 1 }, { a: 1 })).toBe('after');
  expect(compare({ a: 2 }, { a: 1, b: 1 })).toBe('concurrent');
  expect(compare({ a: 1 }, { a: 1 })).toBe('equal');
});

test('two replicas edit the same cart during a partition', () => {
  const v1 = tick({}, 'eu');                      // { eu: 1 }: written in the EU
  const eu = tick(v1, 'eu');                      // EU adds a book
  const us = tick(v1, 'us');                      // US adds a pen, without seeing the book
  expect(compare(v1, eu)).toBe('before');         // a plain update: safe to overwrite
  expect(compare(eu, us)).toBe('concurrent');     // siblings: the app must merge them
});
