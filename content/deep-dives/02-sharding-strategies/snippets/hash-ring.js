import { createHash } from 'node:crypto';
const hash = s => createHash('md5').update(s).digest().readUInt32BE(0);

export class HashRing {
  constructor(nodes = [], vnodes = 100) { this.vnodes = vnodes; this.ring = []; nodes.forEach(n => this.add(n)); }
  add(node) {
    for (let i = 0; i < this.vnodes; i++) this.ring.push({ pos: hash(`${node}#${i}`), node });
    this.ring.sort((a, b) => a.pos - b.pos);
  }
  remove(node) { this.ring = this.ring.filter(p => p.node !== node); }
  get(key) {                                        // binary search for the first point at or after hash(key)
    const h = hash(key);
    let lo = 0, hi = this.ring.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.ring[mid].pos < h) lo = mid + 1; else hi = mid;
    }
    return this.ring[lo % this.ring.length].node;   // wrap around the ring
  }
}
// 4 → 5 nodes moves ~20% of keys (all of them to the new node); hash % N would move ~80%
