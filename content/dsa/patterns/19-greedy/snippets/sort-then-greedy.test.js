import { expect, test } from 'vitest';
import { findContentChildren } from './sort-then-greedy.js';

test('feeds the most children', () => {
  expect(findContentChildren([3, 1, 6, 2, 4], [2, 1, 5, 3, 1])).toBe(4);
  expect(findContentChildren([7, 4, 5], [3, 1, 6, 2])).toBe(1);
  expect(findContentChildren([1, 2], [1, 2, 3])).toBe(2);
});

test('handles nothing to give or nobody to feed', () => {
  expect(findContentChildren([1, 2], [])).toBe(0);
  expect(findContentChildren([], [4])).toBe(0);
});

test('does not reorder the inputs', () => {
  const greed = [3, 1];
  findContentChildren(greed, [5, 1]);
  expect(greed).toEqual([3, 1]);
});
