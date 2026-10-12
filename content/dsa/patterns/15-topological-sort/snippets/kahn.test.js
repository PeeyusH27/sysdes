import { expect, test } from 'vitest';
import { topoSortKahn } from './kahn.js';

const respects = (order, n, edges) => {
  const pos = new Map(order.map((v, i) => [v, i]));
  return order.length === n && pos.size === n && edges.every(([a, b]) => pos.get(a) < pos.get(b));
};

test('returns an order where every edge points forward', () => {
  const edges = [[0, 2], [1, 2], [2, 3], [1, 4], [4, 3]];
  const order = topoSortKahn(5, edges);
  expect(order).toEqual([0, 1, 2, 4, 3]);
  expect(respects(order, 5, edges)).toBe(true);
});

test('nodes without edges still appear', () => {
  expect(topoSortKahn(3, [])).toEqual([0, 1, 2]);
  expect(topoSortKahn(4, [[3, 0]])).toEqual([1, 2, 3, 0]);
});

test('a cycle, a self-loop, or a node stuck behind a cycle gives []', () => {
  expect(topoSortKahn(3, [[0, 1], [1, 2], [2, 0]])).toEqual([]);
  expect(topoSortKahn(1, [[0, 0]])).toEqual([]);
  expect(topoSortKahn(4, [[0, 1], [1, 2], [2, 1], [2, 3]])).toEqual([]);
});
