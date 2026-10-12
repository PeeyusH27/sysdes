import { expect, test } from 'vitest';
import { bfsDistances } from './bfs-distances.js';

test('distances are edge counts from the source', () => {
  expect(bfsDistances(5, [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]], 0)).toEqual([0, 1, 1, 2, 3]);
  expect(bfsDistances(4, [[0, 1], [1, 2], [2, 3], [3, 0]], 1)).toEqual([1, 0, 1, 2]);
});

test('unreachable nodes stay -1', () => {
  expect(bfsDistances(4, [[0, 1]], 0)).toEqual([0, 1, -1, -1]);
  expect(bfsDistances(1, [], 0)).toEqual([0]);
});
