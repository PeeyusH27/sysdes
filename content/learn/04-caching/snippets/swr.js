// In-process stale-while-revalidate: serve stale data instantly, refresh in the background
export function swr(fn, { ttlMs = 30_000, staleMs = 300_000, now = () => Date.now() } = {}) {
  const cache = new Map();                                   // key -> { value, at, refreshing }
  return async (key) => {
    const e = cache.get(key);
    const age = e ? now() - e.at : Infinity;
    if (e && age < ttlMs) return e.value;                    // fresh
    if (e && age < staleMs) {                                // stale but usable
      if (!e.refreshing) {
        e.refreshing = true;
        fn(key).then(
          (value) => cache.set(key, { value, at: now() }),
          () => { e.refreshing = false; },
        );
      }
      return e.value;
    }
    const value = await fn(key);                             // missing or too old: wait for it
    cache.set(key, { value, at: now() });
    return value;
  };
}
