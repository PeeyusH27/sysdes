// @display-only: needs a Redis client (`redis`) and a data access layer (`db`)
// Every write updates the database and the cache together, so the next read is fresh
export async function save(id, data) {
  await db.save(id, data);                                           // the source of truth first
  await redis.set('item:' + id, JSON.stringify(data), 'EX', 3600);   // then the copy
}
