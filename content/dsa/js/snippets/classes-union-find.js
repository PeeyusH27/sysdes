class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i); // everyone is their own root
    this.size = new Array(n).fill(1);
    this.count = n;                                       // number of separate groups
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];       // path halving: flatten as we climb
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;                          // already connected: this edge closes a cycle
    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;                                 // hang the smaller tree under the larger
    this.size[ra] += this.size[rb];
    this.count--;
    return true;
  }
  connected(a, b) {
    return this.find(a) === this.find(b);
  }
}
const uf = new UnionFind(6);
console.log(uf.union(0, 1), uf.union(1, 2), uf.union(3, 4)); // true true true
console.log(uf.union(0, 2));                                  // false: 0 and 2 were already joined
console.log(uf.connected(0, 2), uf.connected(2, 3), uf.count); // true false 3
