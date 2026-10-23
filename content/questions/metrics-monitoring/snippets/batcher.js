// The agent's exporter: collect samples, send them in batches, never block the host, never grow without limit.
//   - Flush when the batch is big enough (size) OR the oldest sample has waited long enough (time).
//   - If a send fails, keep the data and retry later with exponential backoff.
//   - If the buffer is full (the backend is down for long), drop the OLDEST samples: fresh data matters more than old.
// Time is passed in, so tests need no timers.
export class Batcher {
  #buf = [];
  #oldestAt = null;
  #retryAt = 0;
  #attempts = 0;

  constructor({ send, maxItems = 500, maxWaitMs = 1000, maxBuffer = 10_000, retryBaseMs = 200, retryMaxMs = 30_000 }) {
    Object.assign(this, { send, maxItems, maxWaitMs, maxBuffer, retryBaseMs, retryMaxMs });
    this.dropped = 0;
    this.sent = 0;
  }

  get pending() { return this.#buf.length; }

  add(sample, now) {
    if (this.#buf.length >= this.maxBuffer) { this.#buf.shift(); this.dropped++; }
    if (this.#buf.length === 0) this.#oldestAt = now;
    this.#buf.push(sample);
    return this.#due(now) ? this.flush(now) : Promise.resolve(false);
  }

  // Call this from a timer (every 100 ms or so) so a quiet agent still sends what it has.
  tick(now) {
    return this.#due(now) ? this.flush(now) : Promise.resolve(false);
  }

  #due(now) {
    if (this.#buf.length === 0 || now < this.#retryAt) return false;
    return this.#buf.length >= this.maxItems || now - this.#oldestAt >= this.maxWaitMs;
  }

  async flush(now) {
    const batch = this.#buf.splice(0, this.maxItems);
    if (batch.length === 0) return false;
    try {
      await this.send(batch);
      this.sent += batch.length;
      this.#attempts = 0;
      this.#oldestAt = this.#buf.length ? now : null;
      return true;
    } catch {
      this.#buf.unshift(...batch);                      // keep it for next time
      this.#attempts++;
      this.#retryAt = now + Math.min(this.retryMaxMs, this.retryBaseMs * 2 ** (this.#attempts - 1));
      return false;
    }
  }
}
