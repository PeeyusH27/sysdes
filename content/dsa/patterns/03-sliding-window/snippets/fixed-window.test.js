import { expect, test } from 'vitest';
import { maxWindowSum } from './fixed-window.js';

test('finds the best sum of k consecutive values', () => {
  expect(maxWindowSum([2, 1, 5, 1, 3, 2], 3)).toBe(9);
  expect(maxWindowSum([-1, 4, -2, 3, -5], 2)).toBe(3);
  expect(maxWindowSum([-3, -1, -2], 1)).toBe(-1);
});

test('handles k equal to the length and invalid k', () => {
  expect(maxWindowSum([1, 2, 3], 3)).toBe(6);
  expect(maxWindowSum([1, 2], 3)).toBeNull();
  expect(maxWindowSum([], 1)).toBeNull();
});
