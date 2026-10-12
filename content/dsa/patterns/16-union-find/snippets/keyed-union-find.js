// Template 4: union-find over arbitrary keys (emails, words, "r,c" cells) with union by size.
// Keys are added the first time they are seen, so nothing has to be numbered up front,
// and every root knows how many items its group holds.
export class KeyedUnionFind {
  constructor() {
    this.parent = new Map();
    this.sizes = new Map(); // root -> number of items in its group
  }

  add(x) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.sizes.set(x, 1);
    }
  }

  find(x) {
    this.add(x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    while (this.parent.get(x) !== root) {   // path compression
      const next = this.parent.get(x);
      this.parent.set(x, root);
      x = next;
    }
    return root;
  }

  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if (this.sizes.get(ra) < this.sizes.get(rb)) [ra, rb] = [rb, ra];
    this.parent.set(rb, ra);                // union by size: the smaller group joins the larger
    this.sizes.set(ra, this.sizes.get(ra) + this.sizes.get(rb));
    return true;
  }

  sizeOf(x) {
    return this.sizes.get(this.find(x));
  }

  groups() {
    const out = new Map();
    for (const x of this.parent.keys()) {
      const root = this.find(x);
      if (!out.has(root)) out.set(root, []);
      out.get(root).push(x);
    }
    return [...out.values()];
  }
}
