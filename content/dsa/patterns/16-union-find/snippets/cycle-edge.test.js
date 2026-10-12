import { expect, test } from 'vitest';
import { firstCycleEdge, isTree } from './cycle-edge.js';

test('returns the edge that closes the first cycle', () => {
  expect(firstCycleEdge(4, [[0, 1], [1, 2], [2, 3], [3, 1]])).toEqual([3, 1]);
  expect(firstCycleEdge(3, [[0, 1], [1, 2], [0, 2]])).toEqual([0, 2]);
});

test('returns null for a forest', () => {
  expect(firstCycleEdge(5, [[0, 1], [2, 3]])).toBeNull();
  expect(firstCycleEdge(1, [])).toBeNull();
});

test('a tree needs n - 1 edges and no cycle', () => {
  expect(isTree(5, [[0, 1], [0, 2], [0, 3], [1, 4]])).toBe(true);
  expect(isTree(4, [[0, 1], [1, 2], [2, 0]])).toBe(false); // right count, but a cycle and a lonely node
  expect(isTree(4, [[0, 1], [2, 3]])).toBe(false);         // no cycle, but two pieces
  expect(isTree(1, [])).toBe(true);
});
