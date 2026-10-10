// @display-only: needs an ioredis client (`redis`); sliding-window.test.js uses an in-memory fake
// Approximate sliding window from two fixed-window counters (`redis` is an ioredis client)
export async function slidingWindowAllow(redis, key, limit, windowMs, now = Date.now()) {
  const window = Math.floor(now / windowMs);
  const elapsed = (now % windowMs) / windowMs;                        // how far into the current window we are
  const cur = `sw:${key}:${window}`, prev = `sw:${key}:${window - 1}`;
  const [[, count], [, before]] = await redis.multi().incr(cur).get(prev).pexpire(cur, windowMs * 2).exec();
  return Number(before ?? 0) * (1 - elapsed) + count <= limit;        // the previous window counts for the part that still overlaps
}
// Rejected requests are counted too, which makes this slightly stricter. Usually fine for quotas.
