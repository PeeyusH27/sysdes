// Template 2: group keys into buckets by use count. A hit moves a key from bucket c to bucket c + 1 only,
// so eviction needs just the lowest non-empty count (minCount) and, inside it, the oldest key.
export class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.values = new Map(); // key -> value
    this.counts = new Map(); // key -> use count
    this.buckets = new Map(); // count -> Set of keys, oldest first (Sets keep insertion order)
    this.minCount = 0;
  }

  touch(key) {
    const c = this.counts.get(key);
    const bucket = this.buckets.get(c);
    bucket.delete(key);
    if (bucket.size === 0) {
      this.buckets.delete(c);
      if (this.minCount === c) this.minCount = c + 1; // the key itself just moved to c + 1
    }
    this.counts.set(key, c + 1);
    if (!this.buckets.has(c + 1)) this.buckets.set(c + 1, new Set());
    this.buckets.get(c + 1).add(key);
  }

  get(key) {
    if (!this.values.has(key)) return -1;
    this.touch(key);
    return this.values.get(key);
  }

  put(key, value) {
    if (this.capacity === 0) return;
    if (this.values.has(key)) {
      this.values.set(key, value);
      this.touch(key);
      return;
    }
    if (this.values.size === this.capacity) {
      const bucket = this.buckets.get(this.minCount);
      const oldest = bucket.values().next().value; // fewest uses, and the oldest among ties
      bucket.delete(oldest);
      if (bucket.size === 0) this.buckets.delete(this.minCount);
      this.values.delete(oldest);
      this.counts.delete(oldest);
    }
    this.values.set(key, value);
    this.counts.set(key, 1);
    if (!this.buckets.has(1)) this.buckets.set(1, new Set());
    this.buckets.get(1).add(key);
    this.minCount = 1; // a new key always has the lowest count
  }
}
