import { LruPolicy } from './policies.js';

export class Cache {
  // `now` is injected so tests (and TTL logic) never read the real clock.
  constructor({ capacity, policy = new LruPolicy(), ttlMs = Infinity, now = Date.now }) {
    if (!(capacity >= 1)) throw new RangeError('capacity must be at least 1');
    Object.assign(this, { capacity, policy, ttlMs, now });
    this.entries = new Map();                     // key -> { value, expiresAt }
    this.listeners = [];
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  get size() { return this.entries.size; }

  get(key) {
    const e = this.entries.get(key);
    if (e && e.expiresAt <= this.now()) { this.#remove(key, 'expired'); return this.#miss(); }  // lazy expiry
    if (!e) return this.#miss();
    this.policy.onAccess(key);                    // a read is a write to the order: it needs the lock in Java
    this.stats.hits++;
    return e.value;
  }

  put(key, value, ttlMs = this.ttlMs) {
    const expiresAt = this.now() + ttlMs;
    const e = this.entries.get(key);
    if (e) { Object.assign(e, { value, expiresAt }); this.policy.onAccess(key); return; }
    if (this.entries.size >= this.capacity) this.#remove(this.policy.victim(), 'evicted');
    this.entries.set(key, { value, expiresAt });
    this.policy.onInsert(key);
  }

  delete(key) {
    if (!this.entries.has(key)) return false;
    this.#remove(key, 'deleted');
    return true;
  }

  onRemove(listener) { this.listeners.push(listener); }  // observer: metrics, write-back, logging

  #miss() { this.stats.misses++; return undefined; }

  #remove(key, why) {
    const { value } = this.entries.get(key);
    this.entries.delete(key);
    this.policy.onRemove(key);
    if (why === 'evicted') this.stats.evictions++;
    for (const l of this.listeners) l(key, value, why);
  }
}
