import { UnionFind } from './union-find.js';

// Template 2: count groups. Start with n groups (every item alone); each union that really
// merges two roots removes one group. Pairs inside an existing group change nothing.
export function countGroups(n, pairs) {
  const uf = new UnionFind(n);
  for (const [a, b] of pairs) uf.union(a, b);
  return uf.count;
}

// The same loop answers "how big is each group?": bucket every item under its root.
export function groupsOf(n, pairs) {
  const uf = new UnionFind(n);
  for (const [a, b] of pairs) uf.union(a, b);
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);        // always find(i), never parent[i]: a parent is not always a root
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }
  return [...groups.values()];
}
