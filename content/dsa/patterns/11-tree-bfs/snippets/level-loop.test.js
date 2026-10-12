import { expect, test } from 'vitest';
import { levelMaxes, levelValues } from './level-loop.js';
import { fromArray } from './tree.js';

test('levelMaxes keeps one value per level', () => {
  expect(levelMaxes(fromArray([1, 3, 2, 5, 3, null, 9]))).toEqual([1, 3, 9]);
  expect(levelMaxes(fromArray([-4, -7, -2]))).toEqual([-4, -2]);
  expect(levelMaxes(fromArray([1, 2, null, 3]))).toEqual([1, 2, 3]);
  expect(levelMaxes(null)).toEqual([]);
});

test('levelValues groups values level by level, left to right', () => {
  expect(levelValues(fromArray([8, 3, 10, 1, 6, null, 14, null, null, 4, 7]))).toEqual([[8], [3, 10], [1, 6, 14], [4, 7]]);
  expect(levelValues(fromArray([5]))).toEqual([[5]]);
  expect(levelValues(null)).toEqual([]);
});
