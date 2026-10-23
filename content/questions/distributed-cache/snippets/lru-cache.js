// One cache node's memory: a byte-limited LRU with per-key expiry.
//   - A Map remembers insertion order, so "least recently used" is its first key, and "touch" is delete + set.
//   - Entries expire lazily (checked on read) and the oldest are evicted when the memory budget is exceeded.
// The clock is injected so tests need no sleeping.
export class LruCache {
  #map = new Map();                 // key -> { value, size, expiresAt }
  #bytes = 0;

  constructor(maxBytes, { now = () => Date.now() } = {}) {
    this.maxBytes = maxBytes;
    this.now = now;
    this.stats = { hits: 0, misses: 0, evictions: 0, expired: 0 };
  }

  get bytes() { return this.#bytes; }
  get size() { return this.#map.size; }

  get(key) {
    const e = this.#map.get(key);
    if (!e) { this.stats.misses++; return undefined; }
    if (e.expiresAt <= this.now()) {              // expired: remove it and report a miss
      this.#drop(key, e);
      this.stats.expired++;
      this.stats.misses++;
      return undefined;
    }
    this.#map.delete(key);                        // move to the "most recent" end
    this.#map.set(key, e);
    this.stats.hits++;
    return e.value;
  }

  set(key, value, { ttlMs = 60_000, size = 1 } = {}) {
    if (size > this.maxBytes) return false;       // never cache something bigger than the whole cache
    const old = this.#map.get(key);
    if (old) this.#drop(key, old);
    this.#map.set(key, { value, size, expiresAt: this.now() + ttlMs });
    this.#bytes += size;
    while (this.#bytes > this.maxBytes) {         // evict from the least recently used end
      const [oldestKey, oldest] = this.#map.entries().next().value;
      this.#drop(oldestKey, oldest);
      this.stats.evictions++;
    }
    return true;
  }

  delete(key) {
    const e = this.#map.get(key);
    if (e) this.#drop(key, e);
    return !!e;
  }

  #drop(key, e) {
    this.#map.delete(key);
    this.#bytes -= e.size;
  }

  hitRatio() {
    const total = this.stats.hits + this.stats.misses;
    return total ? this.stats.hits / total : 0;
  }
}
