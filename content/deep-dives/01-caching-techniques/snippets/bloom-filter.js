// Bloom filter in front of the cache: "definitely not present" lets you skip both the cache
// and the DB for ids that don't exist (cache penetration). 1M bits + 7 hashes → ~0.65% false positives at 100K keys.
const fmix = h => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
const hash = (s, seed) => { let h = seed; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return fmix(h); };

export class BloomFilter {
  constructor(bits = 1 << 20, hashes = 7) { this.m = bits; this.k = hashes; this.bits = new Uint8Array(bits >> 3); }
  #positions(key) {                                      // double hashing with two independent seeds
    const h1 = hash(key, 0x811c9dc5), h2 = hash(key, 0x9747b28c) | 1;
    return Array.from({ length: this.k }, (_, i) => ((h1 + i * h2) >>> 0) % this.m);
  }
  add(key) { for (const p of this.#positions(key)) this.bits[p >> 3] |= 1 << (p & 7); }
  mightContain(key) { return this.#positions(key).every(p => this.bits[p >> 3] & (1 << (p & 7))); }
}
