import { expect, test } from 'vitest';
import { shortestSumAtLeast } from './shortest-window.js';

test('shortest window whose sum reaches the target', () => {
  expect(shortestSumAtLeast([3, 1, 4, 1, 5, 9], 12)).toBe(2); // [5, 9]
  expect(shortestSumAtLeast([1, 1, 1, 1], 3)).toBe(3);
  expect(shortestSumAtLeast([10], 7)).toBe(1);
});

test('returns 0 when nothing reaches the target', () => {
  expect(shortestSumAtLeast([1, 2, 3], 7)).toBe(0);
  expect(shortestSumAtLeast([], 1)).toBe(0);
});
