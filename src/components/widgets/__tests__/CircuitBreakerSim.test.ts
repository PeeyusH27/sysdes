import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { breakerRequest, cbStep, closedBreaker, initCB, settleProbe, type Breaker, type CBState } from "../CircuitBreakerSim";

const cfg = { threshold: 3, cooldownMs: 1_000, probeMs: 100 };

test("closed: consecutive failures trip the breaker; a success resets the count", () => {
  let b: Breaker = closedBreaker();
  b = breakerRequest(b, 0, cfg, true).breaker;
  b = breakerRequest(b, 10, cfg, true).breaker;
  b = breakerRequest(b, 20, cfg, false).breaker;
  expect(b).toMatchObject({ state: "closed", failures: 0 });
  b = breakerRequest(b, 30, cfg, true).breaker;
  b = breakerRequest(b, 40, cfg, true).breaker;
  const r = breakerRequest(b, 50, cfg, true);
  expect(r.outcome).toBe("error");
  expect(r.breaker).toMatchObject({ state: "open", openedAt: 50 });
});

test("open: fails fast until the cooldown is over, then lets one trial through", () => {
  const open: Breaker = { ...closedBreaker(), state: "open", openedAt: 0 };
  expect(breakerRequest(open, 500, cfg, false).outcome).toBe("fallback");
  const trial = breakerRequest(open, 1_000, cfg, false);
  expect(trial.outcome).toBe("success");
  expect(trial.breaker).toMatchObject({ state: "half-open", probeUntil: 1_100, probeOk: true });
  // while the trial is in flight everyone else gets the fallback
  expect(breakerRequest(trial.breaker, 1_050, cfg, false).outcome).toBe("fallback");
});

test("half-open: trial success closes, trial failure re-opens", () => {
  const ok: Breaker = { ...closedBreaker(), state: "half-open", probeUntil: 100, probeOk: true };
  expect(settleProbe(ok, 99).breaker.state).toBe("half-open");
  expect(settleProbe(ok, 100).breaker).toMatchObject({ state: "closed", failures: 0 });
  const bad: Breaker = { ...ok, probeOk: false };
  expect(settleProbe(bad, 150).breaker).toMatchObject({ state: "open", openedAt: 100 });
});

test("simulation: a fully failing dependency trips, then mostly fast-fails", () => {
  let s = initCB();
  const rand = mulberry32(1);
  const p = { ...cfg, errorRate: 1, rps: 10 };
  for (let i = 0; i < 10; i++) s = cbStep(s, 50, p, rand); // 0.5 s: 3 failures at 10/s
  expect(s.breaker.state).toBe("open");
  expect(s.log[0]).toMatchObject({ from: "closed", to: "open", t: 200 });
  for (let i = 0; i < 190; i++) s = cbStep(s, 50, p, rand); // to 10 s
  expect(s.counts.success).toBe(0);
  expect(s.counts.fallback).toBeGreaterThan(s.counts.error * 3);
  expect(s.log.some((l) => l.from === "half-open" && l.to === "open")).toBe(true);
});

test("simulation: a healthy dependency closes the breaker again", () => {
  let s: CBState = { ...initCB(), breaker: { ...closedBreaker(), state: "open", openedAt: 0 } };
  const rand = mulberry32(2);
  const p = { ...cfg, errorRate: 0, rps: 10 };
  for (let i = 0; i < 40; i++) s = cbStep(s, 50, p, rand); // 2 s
  expect(s.breaker.state).toBe("closed");
  expect(s.log.map((l) => `${l.from}>${l.to}`)).toEqual(["open>half-open", "half-open>closed"]);
  expect(s.counts.error).toBe(0);
});
