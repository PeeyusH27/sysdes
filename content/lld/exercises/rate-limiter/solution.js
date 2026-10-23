// Each algorithm is a small class with the same method: allow(key, now). The limiter only knows that interface.
class FixedWindow {
  constructor({ limit, windowSec }) {
    this.limit = limit;
    this.windowSec = windowSec;
    this.state = new Map(); // key → { window: index of the window, count }
  }
  allow(key, now) {
    const window = Math.floor(now / this.windowSec);
    let s = this.state.get(key);
    if (!s || s.window !== window) {
      s = { window, count: 0 }; // a new window starts at zero
      this.state.set(key, s);
    }
    if (s.count >= this.limit) return false;
    s.count++;
    return true;
  }
}

class SlidingWindowLog {
  constructor({ limit, windowSec }) {
    this.limit = limit;
    this.windowSec = windowSec;
    this.logs = new Map(); // key → timestamps of allowed requests, oldest first
  }
  allow(key, now) {
    if (!this.logs.has(key)) this.logs.set(key, []);
    const log = this.logs.get(key);
    // The window is (now - windowSec, now], so a timestamp exactly windowSec old is already out.
    while (log.length > 0 && log[0] <= now - this.windowSec) log.shift();
    if (log.length >= this.limit) return false; // a rejected request is not logged
    log.push(now);
    return true;
  }
}

class TokenBucket {
  constructor({ capacity, refillPerSec }) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.buckets = new Map(); // key → { tokens, last }
  }
  allow(key, now) {
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: this.capacity, last: now }; // a key starts with a full bucket
      this.buckets.set(key, b);
    }
    b.tokens = Math.min(this.capacity, b.tokens + (now - b.last) * this.refillPerSec);
    b.last = now;
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }
}

// Adding a fourth algorithm means one new class and one new line here. Nothing else changes.
const STRATEGIES = new Map([
  ["fixed-window", FixedWindow],
  ["sliding-window-log", SlidingWindowLog],
  ["token-bucket", TokenBucket],
]);

class RateLimiter {
  constructor(strategy, config) {
    this.useStrategy(strategy, config);
  }

  useStrategy(strategy, config) {
    const Algorithm = STRATEGIES.get(strategy);
    if (!Algorithm) return false; // unknown name: keep the current strategy
    this.algorithm = new Algorithm(config); // a new object means every key starts fresh
    return true;
  }

  allow(key, nowSec) {
    return this.algorithm.allow(key, nowSec);
  }
}
