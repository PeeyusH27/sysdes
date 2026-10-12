// Template 1: union-find (disjoint set union) over items 0 … n - 1.
// parent[] stores a forest: following parent links from any item ends at its group's root.
// Two items are in the same group exactly when they have the same root.
export class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i); // every item starts as its own root
    this.rank = new Array(n).fill(0);                     // upper bound on each root's tree height
    this.count = n;                                       // number of separate groups
  }

  find(x) {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[x] !== root) {                     // path compression: point the whole path at the root
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;                          // already in one group (an edge here closes a cycle)
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;                                 // union by rank: the shorter tree goes under the taller
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    this.count--;
    return true;
  }

  connected(a, b) {
    return this.find(a) === this.find(b);
  }
}
