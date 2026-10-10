// Full-jitter exponential backoff, plus a "retryable" predicate
export async function retry(fn, { tries = 4, baseMs = 100, retryable = (e) => e.retryable ?? true } = {}) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries - 1 || !retryable(e)) throw e;              // never retry validation errors or non-idempotent calls
      await new Promise((r) => setTimeout(r, Math.random() * baseMs * 2 ** i));   // full jitter: wait 0–100, 0–200, 0–400 ms
    }
  }
}
