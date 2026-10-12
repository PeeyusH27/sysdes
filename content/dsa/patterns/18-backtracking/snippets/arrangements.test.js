import { expect, test } from 'vitest';
import { arrangements } from './arrangements.js';

test('ordered selections of k items', () => {
  expect(arrangements(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['a', 'c'], ['b', 'a'], ['b', 'c'], ['c', 'a'], ['c', 'b']]);
});

test('k defaults to every item: all permutations', () => {
  expect(arrangements([1, 2, 3])).toEqual([[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]);
  expect(arrangements([7])).toEqual([[7]]);
  expect(arrangements([1, 2, 3, 4, 5])).toHaveLength(120);
});
