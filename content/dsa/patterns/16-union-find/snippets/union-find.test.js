import { expect, test } from 'vitest';
import { UnionFind } from './union-find.js';

test('union merges groups and count goes down once per merge', () => {
  const uf = new UnionFind(6);
  expect(uf.count).toBe(6);
  expect(uf.union(0, 1)).toBe(true);
  expect(uf.union(2, 3)).toBe(true);
  expect(uf.union(1, 3)).toBe(true);
  expect(uf.count).toBe(3);
  expect(uf.connected(0, 2)).toBe(true);
  expect(uf.connected(0, 4)).toBe(false);
});

test('union returns false when both items already share a root', () => {
  const uf = new UnionFind(3);
  uf.union(0, 1);
  uf.union(1, 2);
  expect(uf.union(2, 0)).toBe(false);
  expect(uf.union(1, 1)).toBe(false);
  expect(uf.count).toBe(1);
});

test('union by rank hangs the shorter tree under the taller one', () => {
  const uf = new UnionFind(5);
  uf.union(0, 1); // rank[0] = 1
  uf.union(0, 2); // 2 joins under 0, rank stays 1
  expect(uf.rank[0]).toBe(1);
  uf.union(3, 0); // rank[3] = 0 < rank[0] = 1, so 3 goes under 0
  expect(uf.parent[3]).toBe(0);
  expect(uf.rank[0]).toBe(1);
});

test('find compresses the path it walks', () => {
  const uf = new UnionFind(5);
  uf.parent = [1, 2, 3, 4, 4]; // a hand-built chain 0 → 1 → 2 → 3 → 4
  expect(uf.find(0)).toBe(4);
  expect(uf.parent).toEqual([4, 4, 4, 4, 4]);
});

test('a single item and an empty structure', () => {
  const one = new UnionFind(1);
  expect(one.find(0)).toBe(0);
  expect(one.count).toBe(1);
  expect(new UnionFind(0).count).toBe(0);
});
