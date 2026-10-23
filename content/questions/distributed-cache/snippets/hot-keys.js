// A hot key (a celebrity profile, a flash-sale item) lands on ONE cache node, so adding nodes does not help.
// The fix lives in the client: notice a key getting hot, and serve it from a tiny local cache for about a second.
// One node then sees at most (clients x 1 request per second) for that key instead of the full firehose.
export class HotKeyGuard {
  #counts = new Map();          // key -> requests in the current one-second window
  #windowStart;
  #local = new Map();           // key -> { value, until }

  constructor({ threshold = 1000, localTtlMs = 1000, now = () => Date.now() } = {}) {
    this.threshold = threshold;          // requests per second that make a key "hot"
    this.localTtlMs = localTtlMs;
    this.now = now;
    this.#windowStart = now();
  }

  // Call on every read. Returns a local value when the key is hot and we hold a fresh copy, otherwise undefined.
  lookup(key) {
    const t = this.now();
    if (t - this.#windowStart >= 1000) { this.#counts.clear(); this.#windowStart = t; }
    this.#counts.set(key, (this.#counts.get(key) ?? 0) + 1);
    const e = this.#local.get(key);
    if (e && e.until > t) return e.value;
    return undefined;
  }

  isHot(key) {
    return (this.#counts.get(key) ?? 0) >= this.threshold;
  }

  // Call after fetching from the cache node: keep a short-lived local copy if the key is hot.
  remember(key, value) {
    if (this.isHot(key)) this.#local.set(key, { value, until: this.now() + this.localTtlMs });
  }
}
