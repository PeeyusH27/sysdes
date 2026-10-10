import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { goodput, retryDelay, simulateRetryStorm } from "../RetryStorm";

test("retry delays per policy", () => {
  const rand = mulberry32(1);
  expect(retryDelay("none", 0, rand)).toBeNull();
  expect(retryDelay("fixed", 5, rand)).toBe(1_000);
  expect([0, 1, 2, 3, 4, 5].map((k) => retryDelay("exp", k, rand))).toEqual([1_000, 2_000, 4_000, 8_000, 8_000, 8_000]);
  for (let k = 0; k < 6; k++) {
    const d = retryDelay("jitter", k, rand)!;
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThan(Math.min(8_000, 1_000 * 2 ** k));
  }
});

test("deterministic for a seed; every request is counted exactly once", () => {
  const a = simulateRetryStorm({ clients: 300, policy: "jitter", seed: 3 });
  expect(simulateRetryStorm({ clients: 300, policy: "jitter", seed: 3 })).toEqual(a);
  expect(a.load.reduce((x, y) => x + y, 0)).toBe(a.sent);
  expect(a.served + a.gaveUp + a.stillWaiting).toBe(300);
});

test("no retries: everyone fails once during the outage and gives up", () => {
  const r = simulateRetryStorm({ clients: 200, policy: "none" });
  expect(r.sent).toBe(200);
  expect(r.gaveUp).toBe(200);
  expect(r.served).toBe(0);
  expect(r.peakAfterRecovery).toBe(0);
});

test("fixed 1 s retries arrive in synchronised spikes", () => {
  const r = simulateRetryStorm({ clients: 300, policy: "fixed" });
  // all 300 clients failed within 0.2 s, so each second their retries land in two 100 ms slots
  expect(r.peak).toBeGreaterThanOrEqual(140);
  expect(r.load[10] + r.load[11]).toBe(300);
});

test("full jitter flattens the load on the recovering server", () => {
  for (const policy of ["fixed", "exp"] as const) {
    const sync = simulateRetryStorm({ clients: 500, policy, seed: 5 });
    const jit = simulateRetryStorm({ clients: 500, policy: "jitter", seed: 5 });
    expect(jit.peakAfterRecovery).toBeLessThan(sync.peakAfterRecovery / 3);
  }
  const jit = simulateRetryStorm({ clients: 300, policy: "jitter", seed: 5 });
  expect(jit.doneAt).not.toBeNull();
  const exp = simulateRetryStorm({ clients: 300, policy: "exp", seed: 5 });
  expect(exp.doneAt === null || exp.doneAt > jit.doneAt!).toBe(true);
});

test("goodput falls once a slot is overloaded", () => {
  expect(goodput(15, 20)).toBe(15);
  expect(goodput(20, 20)).toBe(20);
  expect(goodput(40, 20)).toBe(10);
  expect(goodput(500, 20)).toBe(5); // floor: a quarter of capacity
});

test("with jitter everyone is served; synchronised retries are still failing at 30 s", () => {
  expect(simulateRetryStorm({ clients: 300, policy: "jitter", seed: 7 }).stillWaiting).toBe(0);
  expect(simulateRetryStorm({ clients: 300, policy: "fixed", seed: 7 }).stillWaiting).toBeGreaterThan(0);
  expect(simulateRetryStorm({ clients: 300, policy: "exp", seed: 7 }).stillWaiting).toBeGreaterThan(0);
});
