import { expect, test } from 'vitest';
import { bellmanFord, hasNegativeCycle } from './bellman-ford.js';

test('handles a negative edge that fools Dijkstra', () => {
  expect(bellmanFord(3, [[0, 1, 2], [0, 2, 5], [2, 1, -4]], 0)).toEqual([0, 1, 5]);
  expect(bellmanFord(4, [[0, 1, 4], [0, 2, 5], [2, 1, -3], [1, 3, 2], [2, 3, 6]], 0)).toEqual([0, 2, 5, 4]);
});

test('limits the number of edges when asked', () => {
  const edges = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 2, 5], [0, 3, 9]];
  expect(bellmanFord(4, edges, 0, 1)).toEqual([0, 1, 5, 9]);
  expect(bellmanFord(4, edges, 0, 2)).toEqual([0, 1, 2, 6]); // 0 → 2 → 3, not the 3-edge route
  expect(bellmanFord(4, edges, 0)).toEqual([0, 1, 2, 3]);
});

test('unreachable nodes stay at Infinity', () => {
  expect(bellmanFord(3, [[1, 2, 1]], 0)).toEqual([0, Infinity, Infinity]);
});

test('detects a reachable negative cycle', () => {
  expect(hasNegativeCycle(3, [[0, 1, 1], [1, 2, -2], [2, 1, 1]], 0)).toBe(true);
  expect(hasNegativeCycle(3, [[0, 1, 1], [1, 2, -2], [2, 1, 3]], 0)).toBe(false);
});
