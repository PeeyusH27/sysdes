import { expect, test } from 'vitest';
import { goodNodes, rootToLeafPaths } from './carry-down.js';
import { fromArray } from './tree.js';

test('goodNodes carries the path maximum down', () => {
  expect(goodNodes(fromArray([5, 3, 8, 6, 2, 7, 9]))).toBe(4);
  expect(goodNodes(fromArray([2, 2, 2]))).toBe(3);
  expect(goodNodes(fromArray([-1, -5, -3]))).toBe(1);
  expect(goodNodes(null)).toBe(0);
});

test('rootToLeafPaths copies the path at each leaf', () => {
  expect(rootToLeafPaths(fromArray([1, 2, 3, null, 5]))).toEqual([[1, 2, 5], [1, 3]]);
  expect(rootToLeafPaths(fromArray([7]))).toEqual([[7]]);
  expect(rootToLeafPaths(null)).toEqual([]);
});
