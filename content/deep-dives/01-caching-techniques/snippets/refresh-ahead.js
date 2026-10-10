// @display-only: needs an ioredis client (`redis`)
// Refresh-ahead: once 80% of the TTL has passed, a read triggers a background refresh,
// so hot keys never actually expire for readers
export async function getWithRefreshAhead(key, load, ttlSec = 300) {
  const [[, value], [, ttl]] = await redis.multi().get(key).ttl(key).exec();
  if (value && ttl > 0 && ttl < ttlSec * 0.2) {
    redis.set(`refresh:${key}`, 1, 'EX', 30, 'NX')                    // only one instance refreshes
      .then(won => won && load(key).then(v => redis.set(key, JSON.stringify(v), 'EX', ttlSec)))
      .catch(() => {});                                                  // background work must never crash the read
  }
  if (value) return JSON.parse(value);
  const fresh = await load(key);
  await redis.set(key, JSON.stringify(fresh), 'EX', ttlSec);
  return fresh;
}
