import { expect, test } from 'vitest';
import { binarySearch } from './classic.js';

test('finds every element of a sorted array', () => {
  const nums = [3, 8, 12, 17, 21, 30, 44, 52];
  nums.forEach((x, i) => expect(binarySearch(nums, x)).toBe(i));
});

test('returns -1 for missing values, empty and one-element arrays', () => {
  expect(binarySearch([3, 8, 12, 17, 21, 30, 44, 52], 10)).toBe(-1);
  expect(binarySearch([3, 8, 12], 1)).toBe(-1);
  expect(binarySearch([3, 8, 12], 99)).toBe(-1);
  expect(binarySearch([], 5)).toBe(-1);
  expect(binarySearch([5], 5)).toBe(0);
  expect(binarySearch([5], 4)).toBe(-1);
});
