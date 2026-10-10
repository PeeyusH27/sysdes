// In-memory token bucket: a single instance, and the fallback when Redis is down
export class TokenBucket {
  constructor({ ratePerSec, capacity, now = () => Date.now() }) {
    Object.assign(this, { ratePerSec, capacity, now, tokens: capacity, last: now() });
  }
  take(n = 1) {
    const t = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.last) / 1000) * this.ratePerSec);
    this.last = t;
    if (this.tokens >= n) {
      this.tokens -= n;
      return { ok: true, remaining: Math.floor(this.tokens), retryAfterMs: 0 };
    }
    return { ok: false, remaining: 0, retryAfterMs: Math.ceil(((n - this.tokens) / this.ratePerSec) * 1000) };
  }
}
