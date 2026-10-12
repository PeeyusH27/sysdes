import { expect, test } from 'vitest';
import { countPaths } from './grid-paths.js';

test('counts simple paths around walls', () => {
  expect(countPaths([[0, 0], [0, 0]])).toBe(2);
  expect(countPaths([[0, 0, 0], [0, 1, 0], [0, 0, 0]])).toBe(2);
  expect(countPaths([[0, 0, 0], [0, 0, 0], [0, 0, 0]])).toBe(12);
  expect(countPaths([[0, 1], [0, 0]])).toBe(1);
});

test('edge cases: one cell, blocked start, no way through', () => {
  expect(countPaths([[0]])).toBe(1);
  expect(countPaths([[1, 0], [0, 0]])).toBe(0);
  expect(countPaths([[0, 1], [1, 0]])).toBe(0);
});

test('leaves the grid exactly as it found it', () => {
  const grid = [[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]];
  const copy = grid.map((row) => [...row]);
  countPaths(grid);
  expect(grid).toEqual(copy);
});
