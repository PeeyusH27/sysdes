import { expect, test } from 'vitest';
import { dijkstra, shortestPath } from './dijkstra.js';

const roads = [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5], [3, 4, 3]];

test('finds the shortest distance to every node', () => {
  expect(dijkstra(5, roads, 0)).toEqual([0, 3, 1, 4, 7]);
  expect(dijkstra(3, [[0, 1, 0], [1, 2, 0]], 0)).toEqual([0, 0, 0]); // zero weights are fine
});

test('unreachable nodes stay at Infinity', () => {
  expect(dijkstra(3, [[1, 0, 5]], 0)).toEqual([0, Infinity, Infinity]);
  expect(dijkstra(1, [], 0)).toEqual([0]);
});

test('rebuilds the path from prev pointers', () => {
  expect(shortestPath(5, roads, 0, 4)).toEqual({ dist: 7, path: [0, 2, 1, 3, 4] });
  expect(shortestPath(5, roads, 0, 0)).toEqual({ dist: 0, path: [0] });
  expect(shortestPath(3, [[0, 1, 1]], 0, 2)).toEqual({ dist: -1, path: [] });
});

test('stopping at the target goes wrong with a negative edge', () => {
  // 0 → 2 → 1 costs 5 - 4 = 1, but 1 is popped (and returned) at distance 2 first.
  expect(shortestPath(3, [[0, 1, 2], [0, 2, 5], [2, 1, -4]], 0, 1)).toEqual({ dist: 2, path: [0, 1] });
});
