import { describe, expect, test } from "vitest";
import { dbThroughput, initLive, knee, liveStats, poolCurve, poolModel, queryTime, stepLive, TIMEOUT_MS } from "../PoolSim";

const base = { rate: 340, queryMs: 20, cores: 4 };

describe("PoolSim model", () => {
  test("queries run at full speed up to 2 × cores, then slow down", () => {
    expect(knee(4)).toBe(8);
    expect(queryTime(20, 8, 4)).toBe(20);
    expect(queryTime(20, 16, 4)).toBeGreaterThan(40); // twice the knee: time-sharing plus contention
    // throughput peaks at the knee and then falls
    expect(dbThroughput(20, 8, 4)).toBeGreaterThan(dbThroughput(20, 4, 4));
    expect(dbThroughput(20, 32, 4)).toBeLessThan(dbThroughput(20, 8, 4));
  });

  test("light load and a decent pool: almost no waiting", () => {
    const r = poolModel({ pool: 10, rate: 50, queryMs: 20, cores: 4 });
    expect(r.avgWait).toBeLessThan(0.5);
    expect(r.avgQuery).toBeCloseTo(20, 0);
    expect(r.timeoutRate).toBeLessThan(1e-6);
    expect(r.throughput).toBeCloseTo(50, 0);
  });

  test("a pool too small for the load times requests out", () => {
    // 4 connections × 50 queries/s = 200/s capacity < 340/s offered
    const r = poolModel({ ...base, pool: 4 });
    expect(r.timeoutRate).toBeGreaterThan(0.3);
    expect(r.avgWait).toBeGreaterThan(TIMEOUT_MS * 0.9);
  });

  test("a bigger pool is not faster: the best size is near the knee, and much bigger is slower", () => {
    const { rows, best } = poolCurve(base);
    expect(best).toBeGreaterThanOrEqual(7);
    expect(best).toBeLessThanOrEqual(10);
    expect(rows[32].avgQuery).toBeGreaterThan(rows[8].avgQuery * 1.5);
    expect(rows[32].avgTotal).toBeGreaterThan(rows[best].avgTotal);
    // near capacity an oversized pool tips the database into collapse
    expect(rows[60].timeoutRate).toBeGreaterThan(0.005);
  });

  test("pool 0 means everything times out", () => {
    expect(poolModel({ ...base, pool: 0 }).timeoutRate).toBe(1);
  });

  test("the live simulation agrees with the model roughly (same seed, 20 s)", () => {
    const inputs = { ...base, pool: 10 };
    let s = initLive(1);
    for (let i = 0; i < 400; i++) s = stepLive(s, 50, inputs);
    const st = liveStats(s);
    expect(st.perSec).toBeGreaterThan(280);
    expect(st.perSec).toBeLessThan(400);
    expect(st.timeoutsPerSec).toBe(0);
    expect(st.avgTotal).toBeGreaterThan(15);
    expect(st.avgTotal).toBeLessThan(60);
  });

  test("the live simulation shows timeouts when the pool is too small", () => {
    const inputs = { ...base, pool: 3 };
    let s = initLive(2);
    for (let i = 0; i < 100; i++) s = stepLive(s, 50, inputs);
    expect(s.timeouts).toBeGreaterThan(0);
    expect(s.queue.length).toBeGreaterThan(100);
  });
});
