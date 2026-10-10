// Each app server reserves 1,000 ids per Redis call; no single hot counter
const BLOCK = 1_000;
let next = 0, end = 0, refill = null;

export async function nextId(redis) {
  while (next >= end) {
    refill ??= redis.incrby('url:id', BLOCK)                 // atomic; returns the block's upper bound
      .then(top => { end = top; next = top - BLOCK; })
      .finally(() => { refill = null; });
    await refill;                                            // concurrent callers share one refill
  }
  return next++;
}
// A crash wastes the rest of a block. That's fine: ids only need to be unique, not contiguous.
