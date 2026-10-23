// "Have we queued this URL before?" for billions of URLs, without storing the URLs.
// A Bloom filter keeps a few bits per item. A "no" is always right. A "yes" is wrong with probability about p.

// For n items and a target false-positive rate p:  bits per item = -ln(p) / (ln 2)^2,  hashes = bits per item * ln 2.
export function bloomSize(n, p) {
  const bitsPerItem = -Math.log(p) / Math.LN2 ** 2;
  return { bits: Math.ceil(n * bitsPerItem), bitsPerItem, hashes: Math.max(1, Math.round(bitsPerItem * Math.LN2)) };
}

// FNV-1a, 32 bit. Two different seeds give two independent-enough hashes for double hashing.
function fnv(str, seed) {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export class BloomFilter {
  constructor(n, p = 0.01) {
    const { bits, hashes } = bloomSize(n, p);
    this.bits = bits;
    this.hashes = hashes;
    this.words = new Uint32Array(Math.ceil(bits / 32));
  }

  // Kirsch-Mitzenmacher: position i is h1 + i * h2, so two hashes stand in for k.
  *#positions(item) {
    const h1 = fnv(item, 0);
    const h2 = fnv(item, 0x9e3779b9) | 1;      // odd, so the steps do not repeat early
    for (let i = 0; i < this.hashes; i++) yield ((h1 + Math.imul(i, h2)) >>> 0) % this.bits;
  }

  add(item) {
    for (const pos of this.#positions(item)) this.words[pos >>> 5] |= 1 << (pos & 31);
  }

  has(item) {
    for (const pos of this.#positions(item)) if (!(this.words[pos >>> 5] & (1 << (pos & 31)))) return false;
    return true;
  }

  // True the first time an item is seen, false after: the one call the crawler's link filter needs.
  addIfNew(item) {
    if (this.has(item)) return false;
    this.add(item);
    return true;
  }
}
