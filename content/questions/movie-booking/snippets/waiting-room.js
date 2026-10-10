// @display-only: needs an ioredis client (`redis`); waiting-room.test.js uses an in-memory fake
// Admit users in arrival order, at a rate the booking path can absorb
export async function joinQueue(redis, showId, userId) {
  const ticket = await redis.incr(`wait:${showId}:seq`);
  await redis.zadd(`wait:${showId}`, 'NX', ticket, userId);          // re-joining keeps your original place
  const mine = Number((await redis.zscore(`wait:${showId}`, userId)) ?? ticket);
  const admitted = Number((await redis.get(`wait:${showId}:admitted`)) ?? 0);
  return { position: Math.max(1, mine - admitted) };                  // clients poll this every few seconds
}

// One leader instance runs this every second for each hot show
export async function admitBatch(redis, showId, perTick = 200) {
  const batch = await redis.zpopmin(`wait:${showId}`, perTick);      // [userId, score, userId, score, …]
  for (let i = 0; i < batch.length; i += 2) {
    await redis.set(`admit:${showId}:${batch[i]}`, 1, 'EX', 600);    // 10 minutes to pick seats and pay
    await redis.set(`wait:${showId}:admitted`, batch[i + 1]);
  }
}
export const isAdmitted = (redis, showId, userId) => redis.exists(`admit:${showId}:${userId}`);   // checked by the booking API
