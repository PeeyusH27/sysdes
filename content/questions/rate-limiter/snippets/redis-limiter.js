// @display-only: needs the ioredis package and a running Redis (REDIS_URL)
import Redis from 'ioredis';
import { readFileSync } from 'node:fs';

// Fail fast: never queue commands while disconnected and never wait long. The limiter must not become the outage.
export const redis = new Redis(process.env.REDIS_URL, { enableOfflineQueue: false, maxRetriesPerRequest: 0, commandTimeout: 50 });
redis.defineCommand('tokenBucket', { numberOfKeys: 1, lua: readFileSync(new URL('./token-bucket.lua', import.meta.url), 'utf8') });

export async function check(key, ratePerSec, capacity) {
  const [allowed, remaining, retryAfterMs] = await redis.tokenBucket(`rl:${key}`, ratePerSec, capacity);
  return { ok: allowed === 1, remaining, retryAfterMs };
}
