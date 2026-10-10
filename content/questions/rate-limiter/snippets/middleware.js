// @display-only: needs Express and redis-limiter.js (ioredis + a running Redis)
import { check } from './redis-limiter.js';
import { TokenBucket } from './token-bucket.js';
import { LRU } from './lru.js';                                       // from Learn 4

const fallback = new LRU(10_000);                                     // bounded per-instance buckets for Redis outages

export function rateLimit({ name = 'api', ratePerSec = 5, capacity = 20, keyOf = req => req.user?.id ?? req.ip, failClosed = false } = {}) {
  return async (req, res, next) => {
    const key = `${name}:${keyOf(req)}`;
    let result;
    try {
      result = await check(key, ratePerSec, capacity);
    } catch {
      if (failClosed) return res.status(503).set('Retry-After', '1').json({ error: 'Try again shortly' });
      let bucket = fallback.get(key);
      if (!bucket) fallback.set(key, (bucket = new TokenBucket({ ratePerSec, capacity })));
      result = bucket.take();                                         // approximate: per instance, not global
    }
    res.set({ 'RateLimit-Limit': String(capacity), 'RateLimit-Remaining': String(result.remaining) });
    if (result.ok) return next();
    res.set('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
    res.status(429).json({ error: 'Too many requests' });
  };
}
// app.use('/api', rateLimit());
// app.post('/login', rateLimit({ name: 'login', ratePerSec: 0.1, capacity: 5, keyOf: r => r.ip, failClosed: true }), login);
