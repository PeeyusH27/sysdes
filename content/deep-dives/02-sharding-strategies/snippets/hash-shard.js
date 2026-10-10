import { createHash } from 'node:crypto';
const hash = s => createHash('md5').update(s).digest().readUInt32BE(0);

// Hash the key and take it modulo the shard count. Even spread, but changing the count moves almost every key.
export const shardFor = (id, shardCount) => hash(String(id)) % shardCount;

// const db = pools[shardFor(userId, pools.length)];
