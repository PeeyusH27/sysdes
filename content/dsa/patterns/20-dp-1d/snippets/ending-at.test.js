import { expect, test } from 'vitest';
import { maxSumIncreasing } from './ending-at.js';

test('picks the increasing subsequence with the largest sum', () => {
  expect(maxSumIncreasing([4, 6, 1, 3, 8, 4, 6])).toBe(18); // 4 + 6 + 8
  expect(maxSumIncreasing([1, 101, 2, 3, 100])).toBe(106); // 1 + 2 + 3 + 100
  expect(maxSumIncreasing([10, 5, 4, 3])).toBe(10);
});

test('handles empty, equal and negative values', () => {
  expect(maxSumIncreasing([])).toBe(0);
  expect(maxSumIncreasing([7, 7, 7])).toBe(7); // strictly increasing: equal values can't chain
  expect(maxSumIncreasing([-3, -1, -2])).toBe(-1);
});
