import { expect, test } from 'vitest';
import { buildAdjacency, buildAdjacencyMap } from './adjacency.js';

test('undirected edges are stored both ways', () => {
  expect(buildAdjacency(4, [[0, 1], [1, 2], [0, 2]])).toEqual([[1, 2], [0, 2], [1, 0], []]);
});

test('directed edges are stored one way, isolated nodes get empty lists', () => {
  const adj = buildAdjacency(3, [[0, 1], [0, 2]], true);
  expect(adj).toEqual([[1, 2], [], []]);
  adj[1].push(9);
  expect(adj[2]).toEqual([]); // rows are independent arrays
});

test('map version handles string labels and sinks', () => {
  const adj = buildAdjacencyMap([['a', 'b'], ['b', 'c']], true);
  expect([...adj]).toEqual([['a', ['b']], ['b', ['c']], ['c', []]]);
  expect(buildAdjacencyMap([['x', 'y']]).get('y')).toEqual(['x']);
  expect(buildAdjacencyMap([]).size).toBe(0);
});
