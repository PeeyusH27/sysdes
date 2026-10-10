// A lease alone isn't safe (GC pauses, network delays).
// Every grant carries an increasing token, and storage rejects writes with an older token.
export async function acquire(redis, resource, ttlMs) {
  const token = await redis.incr(`fence:${resource}`);                  // strictly increasing, never reused
  const ok = await redis.set(`lock:${resource}`, token, 'PX', ttlMs, 'NX');
  return ok ? token : null;
}
// The storage side enforces it:
//   UPDATE files SET body = $1, fence = $2 WHERE id = $3 AND fence <= $2
// 0 rows updated → a newer lock holder has already written: this client's lease was stale.
