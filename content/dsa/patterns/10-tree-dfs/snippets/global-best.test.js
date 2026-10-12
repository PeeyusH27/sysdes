import { expect, test } from 'vitest';
import { longestUnivaluePath } from './global-best.js';
import { fromArray } from './tree.js';

test('finds a path that bends below the root', () => {
  expect(longestUnivaluePath(fromArray([1, 4, 5, 4, 4, 5]))).toBe(2);
  expect(longestUnivaluePath(fromArray([2, 7, 2, 7, 7, null, 2]))).toBe(2);
  expect(longestUnivaluePath(fromArray([3, 3, 3, 3, null, null, 3]))).toBe(4);
});

test('a path of one node has no edges', () => {
  expect(longestUnivaluePath(fromArray([1, 2, 3]))).toBe(0);
  expect(longestUnivaluePath(null)).toBe(0);
});
