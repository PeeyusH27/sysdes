// Fill-if-newer: a cache that refuses a stale fill. Every row carries a version that rises on each write.
// invalidate() leaves a tombstone at the new version, so a slow reader still holding version 1 cannot put its copy back.
// In Redis you would run both steps as one Lua script so the compare and the set cannot interleave.
export class VersionedCache {
  #items = new Map();                                   // key -> { value, version, dead }

  get(key) {
    const e = this.#items.get(key);
    return e && !e.dead ? e.value : undefined;          // a tombstone reads as a miss
  }

  fill(key, value, version) {
    const e = this.#items.get(key);
    if (e && (e.version > version || (e.version === version && !e.dead))) return false;   // stale or duplicate
    this.#items.set(key, { value, version, dead: false });
    return true;
  }

  invalidate(key, version) {
    const e = this.#items.get(key);
    if (e && e.version > version) return false;         // a newer write already got here
    this.#items.set(key, { value: undefined, version, dead: true });
    return true;
  }
}
