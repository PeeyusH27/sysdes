// @display-only: needs an ioredis client (`redis`)
// Hot-key salting: spread one celebrity counter over 16 sub-keys; reads add them up.
// (Separate GETs rather than MGET, because in Redis Cluster the sub-keys live in different slots.)
const SALTS = 16;
export const like = postId => redis.incr(`likes:${postId}:${Math.floor(Math.random() * SALTS)}`);
export async function likes(postId) {
  const parts = await Promise.all(Array.from({ length: SALTS }, (_, i) => redis.get(`likes:${postId}:${i}`)));
  return parts.reduce((sum, v) => sum + Number(v ?? 0), 0);
}
