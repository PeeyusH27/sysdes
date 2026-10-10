import { test, expect } from "vitest";
import { initTB, retryAfterHeader, sendOne, stepTB, take, tokenBucketStep } from "../TokenBucketViz";

test("refill is linear in time and capped at capacity", () => {
  expect(tokenBucketStep(0, 500, 2, 10)).toBe(1);
  expect(tokenBucketStep(9.5, 1000, 2, 10)).toBe(10);
  expect(tokenBucketStep(10, 5000, 2, 10)).toBe(10);
});

test("take succeeds while tokens last, then computes the wait from the deficit", () => {
  expect(take(3, 2)).toEqual({ ok: true, tokens: 2, remaining: 2, retryAfterMs: 0 });
  expect(take(0, 2)).toEqual({ ok: false, tokens: 0, remaining: 0, retryAfterMs: 500 }); // 1 token at 2/s
  expect(take(0.25, 1)).toMatchObject({ ok: false, retryAfterMs: 750 });
  // a token that refilled through floating-point steps still counts as whole
  let t = 0;
  for (let i = 0; i < 20; i++) t = tokenBucketStep(t, 50, 1, 5);
  expect(take(t, 1).ok).toBe(true);
});

test("Retry-After header is whole seconds, rounded up, at least 1", () => {
  expect(retryAfterHeader(1)).toBe(1);
  expect(retryAfterHeader(1000)).toBe(1);
  expect(retryAfterHeader(1001)).toBe(2);
});

test("a burst of 20 into a full bucket of 10 lets about 10 through", () => {
  let s = initTB(10);
  s = { ...s, pending: 20, nextSend: 0 };
  for (let i = 0; i < 40; i++) s = stepTB(s, 50, 2, 10); // 2 s: the burst spans 0.8 s
  expect(s.allowed + s.rejected).toBe(20);
  // 10 from the bucket plus whatever refilled during the 0.8 s burst at 2/s (one token)
  expect(s.allowed).toBe(11);
  expect(s.rejected).toBe(9);
});

test("sendOne on an empty bucket records a 429 with the exact wait", () => {
  const s = sendOne({ ...initTB(5), tokens: 0.5 }, 2);
  expect(s.rejected).toBe(1);
  expect(s.last).toMatchObject({ ok: false, retryAfterMs: 250, had: 0.5 });
});
