import { expect, test } from 'vitest';
import { countInRange, firstTrue, lowerBound, upperBound } from './lower-bound.js';

const nums = [1, 3, 3, 3, 5, 8, 9];

test('lower and upper bound bracket every copy of a value', () => {
  expect(lowerBound(nums, 3)).toBe(1);
  expect(upperBound(nums, 3)).toBe(4);
  expect(lowerBound(nums, 4)).toBe(4);   // missing: insert position
  expect(upperBound(nums, 4)).toBe(4);
  expect(lowerBound(nums, 0)).toBe(0);
  expect(lowerBound(nums, 10)).toBe(nums.length);
  expect(lowerBound([], 1)).toBe(0);
});

test('firstTrue works on any monotonic predicate, including over values', () => {
  expect(firstTrue(0, 100, (x) => x * x >= 50)).toBe(8);
  expect(firstTrue(0, 5, () => false)).toBe(5);
  expect(firstTrue(0, 5, () => true)).toBe(0);
});

test('countInRange uses two bounds', () => {
  expect(countInRange(nums, 3, 5)).toBe(4);
  expect(countInRange(nums, 6, 7)).toBe(0);
  expect(countInRange(nums, 0, 100)).toBe(7);
  expect(countInRange(nums, 5, 2)).toBe(0);
});
