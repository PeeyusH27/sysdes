import { expect, test } from 'vitest';
import { buildPrefix2D, rectSum } from './prefix-2d.js';

const grid = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

test('builds the padded 2D prefix table', () => {
  expect(buildPrefix2D(grid)).toEqual([
    [0, 0, 0, 0],
    [0, 1, 3, 6],
    [0, 5, 12, 21],
    [0, 12, 27, 45],
  ]);
  expect(buildPrefix2D([])).toEqual([[0]]);
});

test('answers rectangle sums in O(1)', () => {
  const P = buildPrefix2D(grid);
  expect(rectSum(P, 1, 1, 2, 2)).toBe(28); // 5 + 6 + 8 + 9
  expect(rectSum(P, 0, 0, 2, 2)).toBe(45);
  expect(rectSum(P, 2, 0, 2, 0)).toBe(7);
  expect(rectSum(P, 0, 1, 1, 2)).toBe(16); // 2 + 3 + 5 + 6
});
