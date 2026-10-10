// Snowflake-style 64-bit ids: unique across shards with no coordination, roughly time-ordered.
// 41 bits ms since a custom epoch (~69 years) | 10 bits worker | 12 bits sequence (4,096 ids/ms/worker)
const EPOCH = 1_704_067_200_000n;                       // 2024-01-01T00:00:00Z
export function snowflake(workerId) {
  if (!Number.isInteger(workerId) || workerId < 0 || workerId > 1023) throw new RangeError('workerId must be 0–1023');
  let lastMs = -1n, seq = 0n;
  return function next() {
    let now = BigInt(Date.now());
    if (now < lastMs) throw new Error('clock moved backwards');
    if (now === lastMs) {
      seq = (seq + 1n) & 4095n;
      if (seq === 0n) while ((now = BigInt(Date.now())) <= lastMs) {}   // sequence exhausted: wait for the next ms
    } else seq = 0n;
    lastMs = now;
    return ((now - EPOCH) << 22n) | (BigInt(workerId) << 12n) | seq;
  };
}
// Send ids to browsers as strings: 64-bit values don't fit in a JS number.
