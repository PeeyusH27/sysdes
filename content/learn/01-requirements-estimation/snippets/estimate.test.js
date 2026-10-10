import { test, expect } from 'vitest';
import { estimate, serversNeeded, cacheGB } from './estimate.js';

test('10M DAU × 10 actions/day', () => {
  const e = estimate({ dau: 10e6, actionsPerUser: 10 });
  expect(e).toMatchObject({ avgQps: 1157, peakQps: 3472, writeQps: 105, storageTB: 49.8 });
  expect(e).toEqual({ avgQps: 1157, peakQps: 3472, readQps: 1052, writeQps: 105, storageTB: 49.8, ingressMBps: 0.11 });
  expect(serversNeeded(e.peakQps)).toBe(6);
  expect(cacheGB(e.readQps, 1_000)).toBeCloseTo(18.2, 1);
});

test('ignoring replication gives the source answer of about 17 TB', () => {
  expect(estimate({ dau: 10e6, actionsPerUser: 10, replicas: 1 }).storageTB).toBe(16.6);
});

test('peak QPS tiles: 1M / 10M / 100M DAU at 10 actions, peak = 3× average', () => {
  const peaks = [1e6, 10e6, 100e6].map((dau) => estimate({ dau, actionsPerUser: 10 }).peakQps);
  expect(peaks).toEqual([347, 3472, 34722]);           // ~350 / ~3,500 / ~35,000
});

test('shortcuts and quiz numbers', () => {
  expect(estimate({ dau: 1e6, actionsPerUser: 1 }).avgQps).toBe(12);          // 1M requests/day ≈ 12/s
  expect(Math.round(100e6 / (30 * 86_400))).toBe(39);                         // 100M/month ≈ 40/s
  expect(estimate({ dau: 50e6, actionsPerUser: 20 }).avgQps).toBe(11574);     // ≈ 11.6K
  // 1M writes/day × 2 KB × 3 replicas × 1 year ≈ 2.2 TB
  expect(estimate({ dau: 1e6, actionsPerUser: 1, readWriteRatio: 0, bytesPerWrite: 2_000, years: 1 }).storageTB).toBe(2.2);
  // 200M DAU × 2 tweets × 1 KB × 5 years × 3 replicas ≈ 2.2 PB
  expect(estimate({ dau: 200e6, actionsPerUser: 2, readWriteRatio: 0, years: 5 }).storageTB).toBe(2190);
});

test('servers: 3 zones that survive losing one', () => {
  // 3 per zone × 3 zones = 9; with one zone gone, 6 servers still carry the peak at 60%
  expect(serversNeeded(3472)).toBe(6);
  expect(6 * 1_000 * 0.6).toBeGreaterThanOrEqual(3472);
});
