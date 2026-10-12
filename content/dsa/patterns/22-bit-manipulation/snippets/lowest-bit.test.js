import { expect, test } from 'vitest';
import { countBitsUpTo, isPowerOfTwo, lowestSetBit, popcount } from './lowest-bit.js';

test('counts set bits one at a time', () => {
  expect(popcount(0)).toBe(0);
  expect(popcount(44)).toBe(3);           // 101100
  expect(popcount(2147483647)).toBe(31);
  expect(popcount(-1)).toBe(32);          // all 32 bits of a negative 32-bit integer
});

test('recognises powers of two', () => {
  expect([1, 2, 32, 1024].every(isPowerOfTwo)).toBe(true);
  expect([0, 3, 6, 40, -8].some(isPowerOfTwo)).toBe(false);
});

test('isolates the lowest set bit', () => {
  expect(lowestSetBit(44)).toBe(4);
  expect(lowestSetBit(40)).toBe(8);
  expect(lowestSetBit(0)).toBe(0);
});

test('counts bits for every number up to n', () => {
  expect(countBitsUpTo(7)).toEqual([0, 1, 1, 2, 1, 2, 2, 3]);
  expect(countBitsUpTo(0)).toEqual([0]);
  const big = countBitsUpTo(1000);
  expect(big.every((c, i) => c === popcount(i))).toBe(true);
});
