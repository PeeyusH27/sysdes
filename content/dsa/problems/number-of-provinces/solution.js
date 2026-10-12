class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i); // every city starts as its own root
    this.rank = new Array(n).fill(0);
    this.count = n;                                       // number of separate groups
  }

  find(x) {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[x] !== root) {                     // path compression
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;                          // already in the same province
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;                                 // shorter tree goes under the taller one
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    this.count--;
    return true;
  }
}

function findCircleNum(isConnected) {
  const n = isConnected.length;
  const uf = new UnionFind(n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {                     // the matrix is symmetric: the upper half is enough
      if (isConnected[i][j] === 1) uf.union(i, j);
    }
  }
  return uf.count;
}
