import { expect, test } from 'vitest';
import { buildPrefix, rangeSum } from './prefix-sums.js';

test('builds running sums with a leading 0', () => {
  expect(buildPrefix([3, 1, 4, 1, 5])).toEqual([0, 3, 4, 8, 9, 14]);
  expect(buildPrefix([])).toEqual([0]);
});

test('answers inclusive range sums', () => {
  const p = buildPrefix([3, 1, 4, 1, 5]);
  expect(rangeSum(p, 1, 3)).toBe(6);
  expect(rangeSum(p, 0, 4)).toBe(14);
  expect(rangeSum(p, 2, 2)).toBe(4);
  expect(rangeSum(buildPrefix([-2, 5, -1]), 0, 1)).toBe(3);
});
