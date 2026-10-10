// @display-only: needs redis (ioredis) and graph (the follow graph)
// Read path: a score cursor instead of list offsets, plus the celebrity merge
import { hydrate } from './hydrate.js';
import { mergeTimelines } from './timeline.js';

export async function getFeed(userId, cursor = null, limit = 20) {
  const max = cursor ? `(${cursor}` : '+inf';                     // "(" = exclusive: strictly older than the cursor
  const [pushed, celebs] = await Promise.all([
    redis.zrevrangebyscore(`feed:${userId}`, max, '-inf', 'WITHSCORES', 'LIMIT', 0, limit),
    graph.celebritiesFollowedBy(userId),
  ]);
  const pulled = await Promise.all(celebs.map(c =>
    redis.zrevrangebyscore(`posts:${c}`, max, '-inf', 'WITHSCORES', 'LIMIT', 0, limit)));
  const page = mergeTimelines(pushed, pulled, limit);
  return {
    posts: await hydrate(page.map(e => e.id)),                    // deleted posts drop out here
    nextCursor: page.length < limit ? null : page.at(-1).ts,      // a short page means there is nothing older
  };
}
// Two posts in the same millisecond can straddle a page boundary. Use ids as a tiebreaker if that matters.
