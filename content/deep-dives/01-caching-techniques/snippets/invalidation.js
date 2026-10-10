// @display-only: needs a Redis client (`redis`) and a data access layer (`db`)
// Option 1: delete on write. Every key also has a TTL, the safety net for races you didn't think of.
export async function updateItem(id, data) {
  await db.update(id, data);
  await redis.del('item:' + id);                  // delete, do not update
}

// Option 2: versioned keys. Bump user.version on every write and old entries are simply never read again.
export const userKey = (user) => 'user:' + user.id + ':v' + user.version;   // versioned key
