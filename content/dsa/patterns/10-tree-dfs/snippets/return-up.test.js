import { expect, test } from 'vitest';
import { height, isBalanced } from './return-up.js';
import { fromArray } from './tree.js';

test('height counts nodes on the longest root-to-leaf path', () => {
  expect(height(fromArray([8, 3, 10, 1, 6, null, 14, null, null, 4, 7]))).toBe(4);
  expect(height(fromArray([1, 2, null, 3, null, 4]))).toBe(4);
  expect(height(fromArray([5]))).toBe(1);
  expect(height(null)).toBe(0);
});

test('isBalanced compares subtree heights at every node', () => {
  expect(isBalanced(fromArray([8, 3, 10, 1, 6, null, 14]))).toBe(true);
  expect(isBalanced(fromArray([1, 2, null, 3]))).toBe(false);
  expect(isBalanced(fromArray([1, 2, 2, 3, null, null, 3, 4, null, null, 4]))).toBe(false);
  expect(isBalanced(null)).toBe(true);
});
