export class CircuitOpenError extends Error {}

// closed → (5 failures) → open → (cooldown elapsed) → half-open → (probe ok) → closed
//                                                    half-open → (probe failed) → open
export class CircuitBreaker {
  constructor(fn, { failureThreshold = 5, cooldownMs = 10_000 } = {}) {
    Object.assign(this, { fn, failureThreshold, cooldownMs, state: 'closed', failures: 0, openedAt: 0, probing: false });
  }
  async call(...args) {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt < this.cooldownMs) throw new CircuitOpenError('circuit open');   // fail fast
      this.state = 'half-open';
    }
    const isProbe = this.state === 'half-open';
    if (isProbe) {
      if (this.probing) throw new CircuitOpenError('probe in flight');   // only one trial request at a time
      this.probing = true;
    }
    try {
      const result = await this.fn(...args);
      this.state = 'closed';
      this.failures = 0;
      return result;
    } catch (err) {
      if (isProbe || ++this.failures >= this.failureThreshold) {
        this.state = 'open';
        this.openedAt = Date.now();
      }
      throw err;
    } finally {
      if (isProbe) this.probing = false;                                 // only the probe clears the flag
    }
  }
}
// const recs = new CircuitBreaker(fetchRecommendations);
// try { return await recs.call(userId); } catch { return popularItems(); }   // graceful fallback
