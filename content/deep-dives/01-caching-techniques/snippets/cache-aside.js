// @display-only: needs a Redis client (`redis`) and a data access layer (`db`)
// Check the cache, load the database on a miss, then store the result with a TTL
export async function getItem(id) {
  const key = 'item:' + id;
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const row = await db.find(id);
  await redis.set(key, JSON.stringify(row), 'EX', 300);
  return row;
}
