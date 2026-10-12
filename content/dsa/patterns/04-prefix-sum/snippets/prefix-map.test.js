import { expect, test } from 'vitest';
import { longestSubarrayWithSum } from './prefix-map.js';

test('longest subarray with sum k, negatives allowed', () => {
  expect(longestSubarrayWithSum([2, -1, 3, -2, 1, 4], 3)).toBe(5); // [2, -1, 3, -2, 1]
  expect(longestSubarrayWithSum([0, 3, 0, 0], 3)).toBe(4);
  expect(longestSubarrayWithSum([-1, -1, 1, 1], 0)).toBe(4);
});

test('returns 0 when no subarray sums to k', () => {
  expect(longestSubarrayWithSum([1, 2, 4], 5)).toBe(0);
  expect(longestSubarrayWithSum([], 0)).toBe(0);
});
