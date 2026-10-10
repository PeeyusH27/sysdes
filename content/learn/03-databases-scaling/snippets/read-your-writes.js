// @display-only: needs a primary pool (`primary`), replica pools (`pickReplica`) and Redis (`redis`)
// After a user writes, their reads go to the primary for a short window
const STICKY_MS = 5_000;                                  // longer than typical replica lag

export async function query(sql, params, { userId, write = false } = {}) {
  if (write) {
    const result = await primary.query(sql, params);
    if (userId) await redis.set(`rw:${userId}`, Date.now(), 'PX', STICKY_MS);
    return result;
  }
  const recentlyWrote = userId && (await redis.exists(`rw:${userId}`));
  return (recentlyWrote ? primary : pickReplica()).query(sql, params);
}
