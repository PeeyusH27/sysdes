import { test, expect } from "vitest";
import { burstTimes, counterAt, fixedWindow, maxInAnyWindow, slidingEstimate, slidingWindowCounter } from "../FixedVsSliding";

const count = (xs: boolean[]) => xs.filter(Boolean).length;

test("fixed window lets 2x the limit through around a boundary", () => {
  const times = burstTimes("both");
  const ok = fixedWindow(times, 10, 10_000);
  expect(count(ok)).toBe(20);
  expect(maxInAnyWindow(times, ok, 10_000)).toBe(20);
});

test("sliding window counter stays close to the limit around the same boundary", () => {
  const times = burstTimes("both");
  const ok = slidingWindowCounter(times, 10, 10_000);
  // 10 before the boundary; after it the previous window still weighs ~0.98, so only 2 more fit
  expect(count(ok)).toBe(12);
  expect(ok.slice(0, 10).every(Boolean)).toBe(true);
  expect(ok[10]).toBe(false); // t = 10.0 s: estimate = 10 × 1.0 + 0 = 10, not under the limit
  expect(ok[11]).toBe(true); // t = 10.2 s: 10 × 0.98 + 0 = 9.8
  expect(maxInAnyWindow(times, ok, 10_000)).toBeLessThanOrEqual(12);
});

test("a single burst on one side is treated the same by both", () => {
  for (const which of ["before", "after"] as const) {
    const times = burstTimes(which);
    expect(count(fixedWindow(times))).toBe(10);
    expect(count(slidingWindowCounter(times))).toBe(10);
  }
});

test("estimate weights the previous window by its remaining overlap", () => {
  expect(slidingEstimate(10, 0, 0, 10_000)).toBe(10);
  expect(slidingEstimate(10, 2, 2_500, 10_000)).toBe(9.5);
  expect(slidingEstimate(10, 0, 10_000, 10_000)).toBe(0);
});

test("counterAt reads each counter at a point in time", () => {
  const times = burstTimes("both");
  const fixed = fixedWindow(times);
  expect(counterAt("fixed", times, fixed, 9_999)).toBe(10);
  expect(counterAt("fixed", times, fixed, 10_000)).toBe(1);
  const sliding = slidingWindowCounter(times);
  expect(counterAt("sliding", times, sliding, 10_000)).toBe(10);
  expect(counterAt("sliding", times, sliding, 15_000)).toBeCloseTo(10 * 0.5 + 2);
});
