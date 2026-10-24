// Keys that keep a partition small and a write load even. Pure functions: easy to test, safe to copy.

// Wide-column: one partition per chat per day, so no partition grows without bound.
export function dayBucket(chatId, date) {
  return `${chatId}#${date.toISOString().slice(0, 10)}`;
}

// Key-value: one very hot key becomes n keys. Writes pick one at random...
export function spreadKey(base, n, rnd = Math.random) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  return `${base}#${Math.floor(rnd() * n)}`;
}

// ...and a read asks all n and adds the answers up. That is the price of spreading.
export function readKeys(base, n) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  return Array.from({ length: n }, (_, i) => `${base}#${i}`);
}
