// Single flight: when a hot key expires, one call rebuilds it and every concurrent caller shares its promise.
// Per process only: across 50 app instances, combine it with the Redis lock from the Caching lesson.
const inflight = new Map();

export function load(key, fn) {
  if (!inflight.has(key))
    inflight.set(key, fn().finally(() => inflight.delete(key)));   // forget it once settled, even on error
  return inflight.get(key);
}
