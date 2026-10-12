import { expect, test } from 'vitest';
import { bfsDistances, gridSteps } from './bfs.js';

test('distances in an undirected graph, -1 when unreachable', () => {
  const adj = [[1, 2], [0, 3], [0, 3, 4], [1, 2, 5], [2, 5, 6], [3, 4], [4], []];
  expect(bfsDistances(adj, 0)).toEqual([0, 1, 1, 2, 2, 3, 3, -1]);
  expect(bfsDistances(adj, 7)).toEqual([-1, -1, -1, -1, -1, -1, -1, 0]);
});

test('directed graphs only follow edges forwards', () => {
  expect(bfsDistances([[1], [2], [], [0]], 0)).toEqual([0, 1, 2, -1]);
});

test('fewest moves on a grid', () => {
  const maze = ['..#.', '.##.', '....'];
  expect(gridSteps(maze, [0, 0], [0, 3])).toBe(7);
  expect(gridSteps(maze, [0, 0], [0, 0])).toBe(0);
  expect(gridSteps(maze, [0, 0], [0, 2])).toBe(-1); // the target is a wall
  expect(gridSteps(['.#.', '.#.'], [0, 0], [1, 2])).toBe(-1); // walled off
});
