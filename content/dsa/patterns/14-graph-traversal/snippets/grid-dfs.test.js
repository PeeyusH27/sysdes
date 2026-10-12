import { expect, test } from 'vitest';
import { countRegions, regionSizes } from './grid-dfs.js';

const land = [
  [1, 1, 0, 0, 1],
  [1, 0, 0, 1, 1],
  [0, 0, 1, 0, 0],
  [0, 1, 1, 0, 0],
];

test('counts and measures regions with 4-directional moves', () => {
  expect(countRegions(land)).toBe(3);
  expect(regionSizes(land)).toEqual([3, 3, 3]);
  expect(countRegions([[1, 0], [0, 1]])).toBe(2); // diagonals don't connect
});

test('works for any target value, including strings', () => {
  expect(countRegions([['#', '.', '#'], ['#', '.', '#']], '.')).toBe(1);
  expect(regionSizes([['a', 'a', 'b'], ['b', 'a', 'b']], 'b')).toEqual([2, 1]);
});

test('empty grids, no matches, one big region', () => {
  expect(countRegions([])).toBe(0);
  expect(regionSizes([[0, 0], [0, 0]])).toEqual([]);
  const full = Array.from({ length: 50 }, () => new Array(50).fill(1));
  expect(countRegions(full)).toBe(1);
  expect(regionSizes(full)).toEqual([2500]);
});

test('the iterative version survives a region too deep for recursion', () => {
  const big = Array.from({ length: 400 }, () => new Array(400).fill(1));
  expect(regionSizes(big)).toEqual([160000]);
});
