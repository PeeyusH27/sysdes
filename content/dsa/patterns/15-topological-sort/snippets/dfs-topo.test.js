import { expect, test } from 'vitest';
import { topoSortDfs } from './dfs-topo.js';

const respects = (order, n, edges) => {
  const pos = new Map(order.map((v, i) => [v, i]));
  return order.length === n && pos.size === n && edges.every(([a, b]) => pos.get(a) < pos.get(b));
};

test('reversed finishing order respects every edge', () => {
  const edges = [[0, 2], [1, 2], [2, 3], [1, 4], [4, 3]];
  const order = topoSortDfs(5, edges);
  expect(order).toEqual([1, 4, 0, 2, 3]);
  expect(respects(order, 5, edges)).toBe(true);
});

test('reaching a finished (black) node is not a cycle', () => {
  const edges = [[0, 1], [0, 2], [1, 3], [2, 3]]; // a diamond: 3 is reached twice
  expect(respects(topoSortDfs(4, edges), 4, edges)).toBe(true);
  expect(topoSortDfs(2, [])).toEqual([1, 0]);
});

test('a back edge to a gray node is a cycle', () => {
  expect(topoSortDfs(4, [[0, 1], [1, 2], [2, 3], [3, 1]])).toEqual([]);
  expect(topoSortDfs(1, [[0, 0]])).toEqual([]);
});
