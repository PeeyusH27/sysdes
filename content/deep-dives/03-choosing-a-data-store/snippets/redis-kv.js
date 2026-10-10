// @display-only: needs an ioredis client (`redis`)
// Key-value: one key, one value, about a millisecond. No joins, so the key IS the query.
await redis.set('session:' + id, JSON.stringify(sess), 'EX', 1800);   // expires after 30 idle minutes
await redis.incr('views:' + postId);                                   // atomic: no read-modify-write race
