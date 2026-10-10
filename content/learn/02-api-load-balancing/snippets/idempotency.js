// Express middleware. Repeats of a POST with the same Idempotency-Key replay the stored response.
export function idempotency(redis, ttlSec = 86_400) {
  return async (req, res, next) => {
    const key = req.get('Idempotency-Key');
    if (!key) return next();
    const redisKey = `idem:${req.user?.id ?? 'anon'}:${key}`;
    const claimed = await redis.set(redisKey, JSON.stringify({ state: 'pending' }), 'EX', ttlSec, 'NX');
    if (!claimed) {
      const saved = JSON.parse((await redis.get(redisKey)) ?? '{}');
      if (saved.state === 'done') return res.status(saved.status).json(saved.body);
      return res.status(409).json({ error: 'A request with this key is still in progress' });
    }
    const json = res.json.bind(res);
    res.json = body => {
      const write = res.statusCode < 500
        ? redis.set(redisKey, JSON.stringify({ state: 'done', status: res.statusCode, body }), 'EX', ttlSec)
        : redis.del(redisKey);                               // let the client retry server errors
      write.catch(() => {});
      return json(body);
    };
    next();
  };
}
// If a handler crashes without responding, the key stays "pending" until the TTL expires: keep TTLs modest.
