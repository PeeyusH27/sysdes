import { expect, test } from 'vitest';
import { estimate, perSecond } from './back-of-envelope.js';

test('1M a day is about 12 per second', () => {
  expect(perSecond(1e6)).toBeCloseTo(11.57, 2);
});

test('URL shortener numbers from the case study', () => {
  const e = estimate({ writesPerDay: 100e6 / 30, readsPerWrite: 100, bytesPerWrite: 500, years: 5, replicas: 3 });
  expect(Math.round(e.writeQps)).toBe(39);                   // "≈ 40 writes/s"
  expect(Math.round(e.readQps)).toBe(3_858);                 // "≈ 4,000 redirects/s"
  expect(Math.round(e.peakQps / 1_000)).toBe(12);            // "about 12K/s at peak"
  expect(e.storageTB).toBeCloseTo(3.04, 2);                  // "≈ 3 TB"
  expect(e.withReplicasTB).toBeCloseTo(9.125, 3);            // "≈ 9 TB with 3 replicas"
});

test('notification system average from the case study', () => {
  const e = estimate({ writesPerDay: 50e6 * 10 });
  expect(Math.round(e.writeQps)).toBe(5_787);                // "≈ 5.8K/s"
});

test('defaults: writes only, no storage, 3× peak', () => {
  const e = estimate({ writesPerDay: 86_400 });
  expect(e).toEqual({ writeQps: 1, readQps: 0, peakQps: 3, storageTB: 0, withReplicasTB: 0 });
});
