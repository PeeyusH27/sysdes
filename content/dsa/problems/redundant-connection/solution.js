class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x) {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[x] !== root) {   // path compression
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;        // a and b are already connected
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    return true;
  }
}

function findRedundantConnection(edges) {
  const uf = new UnionFind(edges.length + 1); // nodes are labelled 1..n, and n equals the number of edges
  for (const [a, b] of edges) {
    // If a and b are already connected, this edge closes the cycle. It is the cycle's
    // last edge in input order, which is exactly the one the problem asks for.
    if (!uf.union(a, b)) return [a, b];
  }
  return [];
}
