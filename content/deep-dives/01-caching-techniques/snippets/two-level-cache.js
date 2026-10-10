// @display-only: needs an ioredis client (`redis`)
// Two-level cache: an in-process LRU (L1, microseconds) in front of Redis (L2, ~1 ms).
// Invalidation fans out over pub/sub. Pub/sub can drop messages, so L1 entries also expire quickly.
const l1 = new Map();                                    // key -> { value, exp }
const L1_TTL_MS = 5_000;
const sub = redis.duplicate();
await sub.subscribe('invalidate');
sub.on('message', (_channel, key) => l1.delete(key));    // every instance drops its copy

export async function get(key, load) {
  const e = l1.get(key);
  if (e && e.exp > Date.now()) return e.value;
  const cached = await redis.get(key);
  const value = cached ? JSON.parse(cached) : await load(key);
  if (!cached) await redis.set(key, JSON.stringify(value), 'EX', 300);
  l1.set(key, { value, exp: Date.now() + L1_TTL_MS });   // cap l1's size in production (e.g. the LRU from Learn 4)
  return value;
}
export async function invalidate(key) {
  await redis.del(key);
  await redis.publish('invalidate', key);
}
