import { test, expect } from "vitest";
import { capacity, initQueue, littleWait, queueStep, spike, SPIKE_MS, type QueueState } from "../QueueSim";

const run = (s: QueueState, ms: number, p: Parameters<typeof queueStep>[2]) => {
  for (let t = 0; t < ms; t += 50) s = queueStep(s, 50, p);
  return s;
};

test("capacity = workers × 1000 ÷ ms per job", () => {
  expect(capacity({ rate: 1, workers: 4, msPerJob: 100 })).toBe(40);
  expect(capacity({ rate: 1, workers: 3, msPerJob: 500 })).toBe(6);
});

test("no backlog while arrivals stay under capacity", () => {
  const s = run(initQueue(), 10_000, { rate: 30, workers: 4, msPerJob: 100 });
  expect(s.depth).toBe(0);
  expect(s.outRate).toBeCloseTo(30);
  expect(s.processed).toBeCloseTo(300);
});

test("backlog grows by (arrivals − capacity) per second when overloaded", () => {
  const s = run(initQueue(), 10_000, { rate: 50, workers: 4, msPerJob: 100 });
  expect(s.depth).toBeCloseTo(100, 5); // (50 − 40) × 10 s
  expect(s.outRate).toBeCloseTo(40);
});

test("a ×5 spike builds a backlog that drains at the spare capacity", () => {
  const p = { rate: 30, workers: 4, msPerJob: 100 };
  let s = spike(run(initQueue(), 1_000, p));
  s = run(s, SPIKE_MS, p);
  expect(s.depth).toBeCloseTo((150 - 40) * 5, 5); // 550 jobs after the spike
  s = run(s, 10_000, p);
  expect(s.depth).toBeCloseTo(550 - 10 * 10, 5); // drains at 40 − 30 = 10 jobs/s
});

test("Little's law: wait = depth ÷ throughput", () => {
  expect(littleWait(1_240, 40)).toBe(31);
  expect(littleWait(0, 40)).toBe(0);
  expect(littleWait(10, 0)).toBe(Infinity);
});

test("history samples every 500 ms and keeps the last 120", () => {
  const s = run(initQueue(), 100_000, { rate: 1, workers: 1, msPerJob: 100 });
  expect(s.history).toHaveLength(120);
  expect(s.history[1].t - s.history[0].t).toBe(500);
});
