// @display-only: needs a Redis client (`redis`)
// At most 3 marketing pushes per user per day
export async function underDailyCap(userId, type, cap = 3) {
  const key = `cap:${userId}:${type}:${new Date().toISOString().slice(0, 10)}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 86_400);
  return n <= cap;
}
