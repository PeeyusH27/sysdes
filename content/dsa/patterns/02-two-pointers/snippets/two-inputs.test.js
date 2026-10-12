import { expect, test } from 'vitest';
import { mergeSorted, sortedSquares } from './two-inputs.js';

test('squares of a sorted array stay sorted', () => {
  expect(sortedSquares([-4, -1, 0, 3, 10])).toEqual([0, 1, 9, 16, 100]);
  expect(sortedSquares([-7, -3, 2, 3, 11])).toEqual([4, 9, 9, 49, 121]);
});

test('merges two sorted arrays', () => {
  expect(mergeSorted([1, 4, 9], [2, 3, 10, 12])).toEqual([1, 2, 3, 4, 9, 10, 12]);
  expect(mergeSorted([], [5])).toEqual([5]);
});
