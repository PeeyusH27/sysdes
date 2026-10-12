import { expect, test } from 'vitest';
import { distanceToNearest } from './multi-source-bfs.js';

test('every open cell gets the distance to its nearest exit', () => {
  expect(distanceToNearest(['E..#.', '.#...', '.#.#E', '.....'])).toEqual([
    [0, 1, 2, -1, 2],
    [1, -1, 3, 2, 1],
    [2, -1, 4, -1, 0],
    [3, 4, 3, 2, 1],
  ]);
});

test('walled-off cells and walls stay -1', () => {
  expect(distanceToNearest(['E..#.', '.#.#.', '...#.'])).toEqual([
    [0, 1, 2, -1, -1],
    [1, -1, 3, -1, -1],
    [2, 3, 4, -1, -1],
  ]);
});

test('no exits at all', () => {
  expect(distanceToNearest(['..', '.#'])).toEqual([[-1, -1], [-1, -1]]);
});
