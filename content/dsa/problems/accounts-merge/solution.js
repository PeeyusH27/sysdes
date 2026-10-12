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
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    return true;
  }
}

function accountsMerge(accounts) {
  // Union-find over account indices: two accounts merge when they share an email.
  const uf = new UnionFind(accounts.length);
  const owner = new Map(); // email -> index of the first account that listed it
  accounts.forEach((account, i) => {
    for (let j = 1; j < account.length; j++) {
      const email = account[j];
      if (owner.has(email)) uf.union(i, owner.get(email));
      else owner.set(email, i);
    }
  });

  // Each distinct email appears once in `owner`, so grouping by root also removes duplicates.
  const groups = new Map(); // root account index -> its emails
  for (const [email, i] of owner) {
    const root = uf.find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(email);
  }

  const merged = [];
  for (const [root, emails] of groups) {
    emails.sort(); // plain string order, as the problem asks
    merged.push([accounts[root][0], ...emails]);
  }
  return merged;
}
