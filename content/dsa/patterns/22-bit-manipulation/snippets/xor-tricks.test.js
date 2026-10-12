import { expect, test } from 'vitest';
import { missingNumber, twoSingles, xorAll } from './xor-tricks.js';

test('pairs cancel and the odd one out remains', () => {
  expect(xorAll([5, 9, 3, 12, 3, 5, 12])).toBe(9);
  expect(xorAll([2, -4, 2])).toBe(-4);
  expect(xorAll([])).toBe(0);
});

test('finds the missing number in 0..n', () => {
  expect(missingNumber([4, 0, 1, 3])).toBe(2);
  expect(missingNumber([0, 1, 2])).toBe(3);
  expect(missingNumber([1])).toBe(0);
});

test('separates two single values', () => {
  expect(twoSingles([1, 2, 1, 3, 2, 5])).toEqual([3, 5]);
  expect(twoSingles([-1, 0])).toEqual([-1, 0]);
  expect(twoSingles([4, 7, 4, 9, 7, 6])).toEqual([6, 9]);
});
