// A consistent-hash ring with virtual nodes and a preference list.
//   - Keys and nodes are hashed onto the same circle of 2^32 positions.
//   - A key belongs to the first node clockwise from its position; the next distinct nodes hold its replicas.
//   - Each physical node owns many small arcs (virtual nodes), so load is even and a join or leave moves only ~1/N of the keys.

// 32-bit FNV-1a followed by a finaliser, so similar strings (node-1#1, node-1#2) land far apart.
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export class Ring {
  #points = [];                                   // sorted [{ pos, node }]

  constructor(nodes = [], vnodes = 128) {
    this.vnodes = vnodes;
    this.nodes = new Set();
    nodes.forEach((n) => this.add(n));
  }

  add(node) {
    this.nodes.add(node);
    for (let i = 0; i < this.vnodes; i++) this.#points.push({ pos: hash32(`${node}#${i}`), node });
    this.#points.sort((a, b) => a.pos - b.pos);
  }

  remove(node) {
    this.nodes.delete(node);
    this.#points = this.#points.filter((p) => p.node !== node);
  }

  // Index of the first point at or after the key's position (binary search), wrapping around the circle.
  #start(key) {
    const h = hash32(key);
    let lo = 0, hi = this.#points.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.#points[mid].pos < h) lo = mid + 1; else hi = mid;
    }
    return lo % this.#points.length;
  }

  owner(key) {
    return this.#points[this.#start(key)].node;
  }

  // The n distinct physical nodes responsible for a key: the coordinator first, then its replicas.
  preferenceList(key, n = 3) {
    const out = [];
    const total = this.#points.length;
    for (let i = this.#start(key), seen = 0; out.length < Math.min(n, this.nodes.size) && seen < total; i = (i + 1) % total, seen++) {
      const node = this.#points[i].node;
      if (!out.includes(node)) out.push(node);              // skip further vnodes of a node we already have
    }
    return out;
  }
}
