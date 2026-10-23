class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.values = new Map(); // key -> value
    this.counts = new Map(); // key -> how many times it was used
    this.buckets = new Map(); // count -> Set of keys with that count, oldest use first
    this.minCount = 0; // the lowest count that has a non-empty bucket
  }

  // Move a key from its bucket to the next count's bucket (it was just used).
  touch(key) {
    const c = this.counts.get(key);
    const bucket = this.buckets.get(c);
    bucket.delete(key);
    if (bucket.size === 0) {
      this.buckets.delete(c);
      if (this.minCount === c) this.minCount = c + 1; // the key now lives in bucket c + 1
    }
    this.counts.set(key, c + 1);
    if (!this.buckets.has(c + 1)) this.buckets.set(c + 1, new Set());
    this.buckets.get(c + 1).add(key); // a Set keeps insertion order: newest at the end
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
      const oldest = bucket.values().next().value; // least frequent, and oldest among ties
      bucket.delete(oldest);
      if (bucket.size === 0) this.buckets.delete(this.minCount);
      this.values.delete(oldest);
      this.counts.delete(oldest);
    }
    this.values.set(key, value);
    this.counts.set(key, 1);
    if (!this.buckets.has(1)) this.buckets.set(1, new Set());
    this.buckets.get(1).add(key);
    this.minCount = 1; // a brand-new key always has the lowest count
  }
}
