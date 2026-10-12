import { expect, test } from 'vitest';
import { countPairs } from './complement.js';

test('counts index pairs i < j with nums[i] + nums[j] === target', () => {
  expect(countPairs([1, 5, 3, 3, 3, 7], 6)).toBe(4); // (1, 5) and three ways to pick two 3s
  expect(countPairs([3, 4, 2], 6)).toBe(1);          // 3 can't pair with itself
  expect(countPairs([-2, 2, 0, 0], 0)).toBe(2);
});

test('returns 0 when nothing pairs up', () => {
  expect(countPairs([1, 2, 3], 10)).toBe(0);
  expect(countPairs([], 0)).toBe(0);
  expect(countPairs([5], 10)).toBe(0);
});
