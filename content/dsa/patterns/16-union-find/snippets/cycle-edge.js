import { UnionFind } from './union-find.js';

// Template 3: cycle detection in an undirected graph. Add the edges one by one; the first edge
// whose two ends already share a root closes a cycle (they were connected without it).
export function firstCycleEdge(n, edges) {
  const uf = new UnionFind(n);
  for (const [a, b] of edges) {
    if (!uf.union(a, b)) return [a, b];
  }
  return null; // the edges form a forest
}

// A graph is a tree when it has exactly n - 1 edges and none of them closes a cycle.
export function isTree(n, edges) {
  return edges.length === n - 1 && firstCycleEdge(n, edges) === null;
}
