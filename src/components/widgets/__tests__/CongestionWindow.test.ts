import { test, expect } from "vitest";
import { cwndSeries } from "@content/cs/lessons/06-tcp-in-depth/snippets/congestion.js";
import { ROUNDS, windowSeries } from "../CongestionWindow";

test("the widget plots the same window as the lesson snippet", () => {
  const w = windowSeries({ ssthresh: 64, kind: "dupack", lossRound: 8, rwnd: 1000 });
  expect(w.cwnd).toEqual(cwndSeries({ rounds: ROUNDS, initial: 10, ssthresh: 64, loss: { round: 8, kind: "dupack" } }));
  expect(w.cwnd).toHaveLength(ROUNDS);
});

test("the receiver's window caps what is sent without changing the congestion window", () => {
  const w = windowSeries({ ssthresh: 64, kind: "none", lossRound: 8, rwnd: 32 });
  expect(Math.max(...w.sent)).toBe(32);
  expect(w.peak).toBeGreaterThan(32);
});

test("a timeout costs more throughput than three duplicate ACKs at the same moment", () => {
  const dup = windowSeries({ ssthresh: 64, kind: "dupack", lossRound: 8, rwnd: 128 });
  const timeout = windowSeries({ ssthresh: 64, kind: "timeout", lossRound: 8, rwnd: 128 });
  expect(timeout.average).toBeLessThan(dup.average);
  expect(timeout.mbps).toBeLessThan(dup.mbps);
});

test("average throughput follows the average window", () => {
  const w = windowSeries({ ssthresh: 64, kind: "none", lossRound: 8, rwnd: 64 });
  expect(w.mbps).toBeCloseTo((w.average * 1460 * 8) / 0.05 / 1e6, 6);
});
