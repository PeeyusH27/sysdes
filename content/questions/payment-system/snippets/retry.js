// Exponential backoff with full jitter: wait a random time in [0, min(cap, base × 2^attempt)).
// The randomness spreads retries out, so a PSP blip doesn't turn into a synchronized retry storm.
// Retrying a charge is only safe because every attempt sends the same idempotency key.

export function backoffDelay(attempt, { baseMs = 200, capMs = 10_000, rng = Math.random } = {}) {
  const ceiling = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.floor(rng() * ceiling);
}

export async function retry(fn, { retries = 3, baseMs, capMs, rng, isRetryable = () => true, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      // Never retry a definite answer (a decline, a 4xx): only timeouts, resets and 5xx.
      if (attempt >= retries || !isRetryable(err)) throw err;
      await sleep(backoffDelay(attempt, { baseMs, capMs, rng }));
    }
  }
}
