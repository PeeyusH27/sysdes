import { expect, test } from 'vitest';
import { mergeSortedArrays } from './k-way-merge.js';

test('merges several sorted arrays', () => {
  expect(mergeSortedArrays([[1, 4, 9], [2, 3, 10], [5, 6]])).toEqual([1, 2, 3, 4, 5, 6, 9, 10]);
  expect(mergeSortedArrays([[-3, 0], [-5, 7, 8]])).toEqual([-5, -3, 0, 7, 8]);
});

test('handles empty inputs and duplicates', () => {
  expect(mergeSortedArrays([])).toEqual([]);
  expect(mergeSortedArrays([[], []])).toEqual([]);
  expect(mergeSortedArrays([[1, 1], [], [0, 1]])).toEqual([0, 1, 1, 1]);
});
