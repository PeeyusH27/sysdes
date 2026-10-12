import { expect, test } from 'vitest';
import { pairSum } from './opposite-ends.js';

test('finds the pair in a sorted array', () => {
  expect(pairSum([1, 3, 4, 6, 8, 11], 10)).toEqual([2, 3]);
  expect(pairSum([-3, -1, 0, 2, 5], -4)).toEqual([0, 1]);
});

test('returns [-1, -1] when no pair exists', () => {
  expect(pairSum([2, 4, 5, 9], 12)).toEqual([-1, -1]);
  expect(pairSum([], 1)).toEqual([-1, -1]);
});
