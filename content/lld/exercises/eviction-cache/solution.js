// Strategy: each policy answers "who goes next?" and nothing else. The cache owns the values.
class LruPolicy {
  constructor() { this.order = new Map(); } // a Map iterates in insertion order: first key = least recent
  insert(key) { this.order.set(key, true); }
  use(key) { this.order.delete(key); this.order.set(key, true); } // re-insert = newest
  forget(key) { this.order.delete(key); }
  ranked() { return [...this.order.keys()]; }
}

class FifoPolicy {
  constructor() { this.order = new Set(); }
  insert(key) { this.order.add(key); }
  use() {} // reads and replacements do not change the order
  forget(key) { this.order.delete(key); }
  ranked() { return [...this.order]; }
}

class LfuPolicy {
  constructor() { this.info = new Map(); this.tick = 0; } // key -> { count, last }
  insert(key) { this.info.set(key, { count: 1, last: ++this.tick }); }
  use(key) { const i = this.info.get(key); i.count++; i.last = ++this.tick; }
  forget(key) { this.info.delete(key); } // the count is forgotten with the key
  ranked() {
    return [...this.info].sort((a, b) => a[1].count - b[1].count || a[1].last - b[1].last).map(([k]) => k);
  }
}

// Adding a policy is one line here; EvictionCache never changes.
const POLICIES = { lru: LruPolicy, fifo: FifoPolicy, lfu: LfuPolicy };

class EvictionCache {
  constructor(capacity, policy) {
    this.capacity = capacity;
    this.policy = new POLICIES[policy]();
    this.values = new Map();
  }

  get(key) {
    if (!this.values.has(key)) return -1;
    this.policy.use(key);
    return this.values.get(key);
  }

  put(key, value) {
    if (this.values.has(key)) {
      this.values.set(key, value);
      this.policy.use(key);
      return ''; // replacing never grows the cache
    }
    const evicted = this.values.size >= this.capacity ? this.#evictOne() : '';
    this.values.set(key, value);
    this.policy.insert(key);
    return evicted;
  }

  peek(key) {
    return this.values.has(key) ? this.values.get(key) : -1;
  }

  remove(key) {
    if (!this.values.delete(key)) return false;
    this.policy.forget(key);
    return true;
  }

  keys() {
    return this.policy.ranked();
  }

  resize(capacity) {
    this.capacity = capacity;
    const evicted = [];
    while (this.values.size > capacity) evicted.push(this.#evictOne());
    return evicted;
  }

  #evictOne() {
    const victim = this.policy.ranked()[0];
    this.values.delete(victim);
    this.policy.forget(victim);
    return victim;
  }
}
