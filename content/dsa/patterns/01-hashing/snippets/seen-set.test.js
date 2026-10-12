import { expect, test } from 'vitest';
import { firstRepeat } from './seen-set.js';

test('returns the first value seen twice', () => {
  expect(firstRepeat([4, 7, 2, 9, 7, 1])).toBe(7);
  expect(firstRepeat([3, 1, 3, 1])).toBe(3);
  expect(firstRepeat('abcb')).toBe('b');
});

test('returns null when every value is distinct', () => {
  expect(firstRepeat([5, 3, 8, 1])).toBeNull();
  expect(firstRepeat([])).toBeNull();
});
