// Full-jitter backoff: wait a random time between 0 and min(cap, base × 2^attempt).
// The randomness spreads retries out, so 100K clients don't all come back in the same second.
export function backoffDelay(attempt, { baseMs = 1_000, capMs = 30_000, random = Math.random } = {}) {
  return random() * Math.min(capMs, baseMs * 2 ** attempt);
}
