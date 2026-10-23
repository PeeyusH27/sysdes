import { expect, test } from 'vitest';
import { searchFlat, searchStaircase } from './sorted-matrix.js';

const chained = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]];

test('searchFlat treats the grid as one sorted list', () => {
  for (const v of chained.flat()) expect(searchFlat(chained, v)).toBe(true);
  for (const v of [0, 2, 13, 61]) expect(searchFlat(chained, v)).toBe(false);
  expect(searchFlat([[4]], 4)).toBe(true);
  expect(searchFlat([[4]], 5)).toBe(false);
});

test('searchStaircase works when only rows and columns are sorted', () => {
  const grid = [[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]];
  for (const v of grid.flat()) expect(searchStaircase(grid, v)).toBe(true);
  for (const v of [0, 15, 18, 20]) expect(searchStaircase(grid, v)).toBe(false);
});

test('both agree on a chained grid', () => {
  for (let v = 0; v <= 62; v++) expect(searchStaircase(chained, v)).toBe(searchFlat(chained, v));
});
