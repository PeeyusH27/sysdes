import { expect, test } from 'vitest';
import { spiralFill, spiralOrder } from './spiral.js';

test('spiralOrder reads a square grid clockwise', () => {
  expect(spiralOrder([[1, 2, 3], [4, 5, 6], [7, 8, 9]])).toEqual([1, 2, 3, 6, 9, 8, 7, 4, 5]);
});

test('spiralOrder handles wide, tall and single-line grids without repeats', () => {
  expect(spiralOrder([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]])).toEqual([1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]);
  expect(spiralOrder([[1, 2], [3, 4], [5, 6]])).toEqual([1, 2, 4, 6, 5, 3]);
  expect(spiralOrder([[1, 2, 3]])).toEqual([1, 2, 3]);
  expect(spiralOrder([[1], [2], [3]])).toEqual([1, 2, 3]);
});

test('spiralFill writes 1..n*n along the spiral, and spiralOrder reads it back in order', () => {
  expect(spiralFill(3)).toEqual([[1, 2, 3], [8, 9, 4], [7, 6, 5]]);
  expect(spiralFill(1)).toEqual([[1]]);
  for (const n of [2, 4, 5]) expect(spiralOrder(spiralFill(n))).toEqual(Array.from({ length: n * n }, (_, i) => i + 1));
});
