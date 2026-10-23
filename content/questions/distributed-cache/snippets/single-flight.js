// A cache stampede: a popular key expires and 1,000 requests miss at the same moment, all asking the database.
// Single flight: the first miss starts the load; everyone else waits for that same promise. One database read, not 1,000.
// Plus two cheap helpers: jittered TTLs (so keys do not all expire together) and a negative cache for "does not exist".
export class SingleFlight {
  #inflight = new Map();

  async do(key, load) {
    const running = this.#inflight.get(key);
    if (running) return running;                          // join the load that is already under way
    const p = (async () => {
      try { return await load(); } finally { this.#inflight.delete(key); }   // on failure, do not remember the error
    })();
    this.#inflight.set(key, p);
    return p;
  }
}

// ttl plus or minus `spread` (0.1 = 10%). A batch of keys written together now expires over a window, not an instant.
export const jitter = (ttlMs, spread = 0.1, rnd = Math.random) => Math.round(ttlMs * (1 - spread + 2 * spread * rnd()));

// Read-through helper: cache -> single-flight load -> fill the cache.
export async function getOrLoad({ cache, flights, key, load, ttlMs = 60_000, missTtlMs = 5_000 }) {
  const cached = cache.get(key);
  if (cached !== undefined) return cached === NOT_FOUND ? null : cached;
  return flights.do(key, async () => {
    const value = await load();
    // Cache "not found" briefly too, so a flood of requests for a missing id does not reach the database.
    cache.set(key, value ?? NOT_FOUND, { ttlMs: value == null ? missTtlMs : jitter(ttlMs) });
    return value ?? null;
  });
}

const NOT_FOUND = Symbol('not-found');
