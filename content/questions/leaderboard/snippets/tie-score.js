// A sorted-set score is a double. To make "first to reach wins" automatic, pack the points into
// the high bits and "how early" into the low bits: equal points then sort earliest-first.
// A double holds every integer exactly only up to 2^53, so points bits + time bits must be <= 53.
export const TIME_BITS = 28;                          // seconds since the season started: 2^28 s ≈ 8.5 years
export const TIME_SPAN = 2 ** TIME_BITS;              // 268,435,456
export const MAX_TS = TIME_SPAN - 1;
export const MAX_POINTS = 2 ** (53 - TIME_BITS) - 1;  // 33,554,431: the largest total that stays exact

export function encode(points, tsSec) {
  if (!Number.isSafeInteger(points) || points < 0 || points > MAX_POINTS) throw new RangeError(`points out of range: ${points}`);
  if (!Number.isSafeInteger(tsSec) || tsSec < 0 || tsSec > MAX_TS) throw new RangeError(`time out of range: ${tsSec}`);
  // An earlier time leaves a larger remainder, so it ranks higher among equal points.
  return points * TIME_SPAN + (MAX_TS - tsSec);
}

export function decode(composite) {
  const points = Math.floor(composite / TIME_SPAN);
  return { points, tsSec: MAX_TS - (composite - points * TIME_SPAN) };
}

export const seasonSeconds = (nowMs, seasonStartMs) => Math.floor((nowMs - seasonStartMs) / 1000);

// Adding points changes both halves: the total grows and "reached at" becomes now.
// That's a read-modify-write (ZSCORE, decode, add, ZADD), so in Redis it belongs inside the Lua
// script that applies the event, never as two round trips from the app.
export const addPoints = (composite, delta, tsSec) => encode(decode(composite).points + delta, tsSec);
