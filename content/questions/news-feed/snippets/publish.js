// @display-only: needs db, redis (ioredis), graph (the follow graph), queue and activeSince()
// Write path with hybrid fan-out
const CELEBRITY_THRESHOLD = 100_000;

export async function publishPost(post) {                         // { id, authorId, createdAt, … }
  await db.posts.insert(post);
  await redis.zadd(`posts:${post.authorId}`, post.createdAt, post.id);   // author timeline (used for pull)
  await redis.zremrangebyrank(`posts:${post.authorId}`, 0, -801);
  if ((await graph.followerCount(post.authorId)) > CELEBRITY_THRESHOLD) return;   // merged at read time instead
  for await (const batch of graph.followersInBatches(post.authorId, 1_000)) {
    await queue.publish('fanout', { postId: post.id, ts: post.createdAt, to: batch });   // 1 message per 1,000 followers
  }
}

// Fan-out worker. With ioredis enableAutoPipelining, these calls are batched per node (works with Redis Cluster).
export async function fanoutWorker({ postId, ts, to }) {
  const active = await activeSince(to, 30);                       // skip users inactive for 30 days
  await Promise.all(active.flatMap(userId => [
    redis.zadd(`feed:${userId}`, ts, postId),
    redis.zremrangebyrank(`feed:${userId}`, 0, -801),             // keep the newest 800
  ]));
}
