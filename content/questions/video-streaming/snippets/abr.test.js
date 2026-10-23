import { test, expect } from 'vitest';
import { LADDER, ThroughputEstimator, pickRendition } from './abr.js';

const pick = (throughputBps, bufferS, current) => pickRendition(LADDER, { throughputBps, bufferS, current });

test('picks the best rendition inside 80% of measured throughput', () => {
  // 4 Mbps * 0.8 = 3.2 Mbps: 720p (2.5) fits, 1080p (5) does not
  expect(LADDER[pick(4_000_000, 20, 3)].label).toBe('720p');
  // 7 Mbps * 0.8 = 5.6 Mbps: 1080p fits
  expect(LADDER[pick(7_000_000, 20, 4)].label).toBe('1080p');
  // 300 kbps: nothing fits, so the lowest one
  expect(LADDER[pick(300_000, 20, 0)].label).toBe('240p');
});

test('a drop in bandwidth is followed at once, without waiting for the buffer', () => {
  expect(LADDER[pick(1_000_000, 30, 4)].label).toBe('360p');          // 1 Mbps * 0.8 = 0.8 Mbps
});

test('going up takes a healthy buffer and one step at a time', () => {
  expect(pick(7_000_000, 6, 1)).toBe(1);                              // fast network, thin buffer: hold
  expect(pick(7_000_000, 15, 1)).toBe(2);                             // healthy buffer: one step up, not straight to 1080p
});

test('a nearly empty buffer forces a step down even when the estimate looks fine', () => {
  expect(pick(7_000_000, 2, 4)).toBe(3);
  expect(pick(7_000_000, 2, 0)).toBe(0);                              // nowhere lower to go
});

test('the estimator smooths: one slow segment does not collapse the estimate', () => {
  const e = new ThroughputEstimator(0.3);
  e.sample(1_000_000, 2);                                             // 4 Mbps
  expect(e.bps).toBe(4_000_000);
  e.sample(250_000, 2);                                               // a 1 Mbps outlier
  expect(e.bps).toBeCloseTo(0.3 * 1_000_000 + 0.7 * 4_000_000, 0);    // 3.1 Mbps, not 1
});

test('ladder arithmetic used on the page: all five renditions of a 10 minute video are 742.5 MB', () => {
  const totalBps = LADDER.reduce((n, r) => n + r.bps, 0);
  expect(totalBps).toBe(9_900_000);
  expect((totalBps * 600) / 8 / 1e6).toBe(742.5);
});
