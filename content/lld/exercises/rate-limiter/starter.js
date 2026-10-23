class RateLimiter {
  /** `strategy` is "fixed-window", "sliding-window-log" or "token-bucket"; `config` holds that strategy's numbers. */
  constructor(strategy, config) {
    
  }

  /** Switch algorithm at runtime and start every key fresh. @return {boolean} false (and change nothing) for an unknown strategy name */
  useStrategy(strategy, config) {
    
  }

  /** Decide one request for `key` at time `nowSec`; count it only if allowed. @return {boolean} */
  allow(key, nowSec) {
    
  }
}
