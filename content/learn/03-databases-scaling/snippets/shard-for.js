// Hash a user id to one of N shards
import { createHash } from 'node:crypto';

export const SHARDS = ['db0', 'db1', 'db2', 'db3'];

export function shardFor(userId) {
  const h = createHash('md5').update(String(userId)).digest().readUInt32BE(0);
  return SHARDS[h % SHARDS.length];  // one user's rows stay on one shard
}
// Simple, but adding a 5th shard changes h % N for ~80% of users: see consistent hashing.
