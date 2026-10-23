Build a **rate limiter** that decides, for each request, whether it may go through. There are three well-known algorithms, and the point of the exercise is that they all sit behind **one** method, `allow`, and the caller picks one by name. The caller must never contain an `if (strategy === ...)` ladder, and adding a fourth algorithm later must not mean editing the three that already work. This is the Strategy pattern.

Implement the class `RateLimiter`:

- `RateLimiter(strategy, config)`: starts with the named strategy. The three names and their configs are below.
- `allow(key, nowSec)`: returns `true` if the request from `key` at time `nowSec` (seconds) is allowed, otherwise `false`. A request is **counted only when it is allowed**; a rejected request uses up nothing. Keys are fully independent of each other, so every key has its own budget.
- `useStrategy(strategy, config)`: switches to another strategy while the limiter is running and returns `true`. Every key starts **fresh** under the new strategy, as if it had never been seen. If the name is unknown it returns `false` and changes nothing: the old strategy and all its state stay as they were.

**The three strategies**

- `"fixed-window"` with `{limit, windowSec}`. Time is cut into windows `[k × windowSec, (k + 1) × windowSec)` for `k = 0, 1, 2, ...`. A key may have at most `limit` allowed requests in each window, and its count goes back to zero when a new window starts.
- `"sliding-window-log"` with `{limit, windowSec}`. A request at time `t` is allowed only if the key has fewer than `limit` allowed requests in the window `(t - windowSec, t]`. The start is exclusive: a request made exactly `windowSec` seconds ago no longer counts.
- `"token-bucket"` with `{capacity, refillPerSec}`. Each key owns a bucket that holds up to `capacity` tokens and is **full the first time the key is seen**. Tokens flow back continuously at `refillPerSec` per second, never above `capacity`, so after `d` quiet seconds the bucket holds `min(capacity, tokens + d × refillPerSec)`, fractions included. A request needs at least one whole token (`tokens >= 1`) and takes exactly one when it is allowed.

**Notes**

- Time is passed in, never read from a clock. `nowSec` never decreases for the same limiter and may be fractional such as `0.25`.
- Configs are always valid positive numbers, and the constructor is always given a known strategy name.
- The fixed window is the cheap one but it has a flaw the others do not: a burst at the end of one window followed by a burst at the start of the next lets nearly `2 × limit` requests through in a short time. The tests check that difference.
- Return values must be exactly `true` or `false`.
