import { test, expect } from 'vitest';
import { bytesPerSample, timestampBits, valueBits } from './gorilla.js';

const n = 360;                                                    // one hour at one sample every 10 s
const ts = Array.from({ length: n }, (_, i) => 1_700_000_000 + i * 10);

test('a perfectly regular schedule costs about 1 bit per timestamp, against 64 for a raw one', () => {
  const perSample = timestampBits(ts) / n;
  expect(perSample).toBeGreaterThan(1);
  expect(perSample).toBeLessThan(1.5);
});

test('one late sample costs a few extra bits, not a restart', () => {
  const late = ts.map((t, i) => (i === 100 ? t + 1 : t));
  const extra = timestampBits(late) - timestampBits(ts);
  expect(extra).toBeGreaterThan(0);
  expect(extra).toBeLessThan(40);                                 // two non-zero delta-of-deltas of 9 bits, minus the 1-bit zeros they replace
});

test('a flat metric needs about 1 bit per value', () => {
  expect(valueBits(ts.map(() => 42)) / n).toBeLessThan(1.5);
});

test('a counter that grows by a constant is cheap; a noisy float is dearer; the raw size is 16 bytes', () => {
  let s = 5;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  const flat = bytesPerSample(ts, ts.map(() => 42));
  const counter = bytesPerSample(ts, ts.map((_, i) => i * 3));
  const noisy = bytesPerSample(ts, ts.map(() => Math.round((40 + rnd() * 20) * 10) / 10));
  expect(flat).toBeLessThan(0.5);
  expect(counter).toBeLessThan(3);
  expect(noisy).toBeGreaterThan(counter);
  expect(noisy).toBeLessThan(16);                                 // even noise beats the 16-byte raw sample
});

test('the sums on the page: 1M samples a second is 1.38 TB a day raw and about 118 GB at 1.37 bytes', () => {
  expect((1e6 * 16 * 86_400) / 1e12).toBeCloseTo(1.38, 2);
  expect((1e6 * 1.37 * 86_400) / 1e9).toBeCloseTo(118.4, 1);
});

test('retention budget: 15 days raw + 90 days of 1-minute rollups + 2 years of hourly rollups is about 10.6 TB', () => {
  const rawGbPerDay = (1e6 * 1.37 * 86_400) / 1e9;                // 118.4 GB
  const minuteGbPerDay = (10e6 * 1440 * 6) / 1e9;                 // 10M series, 1,440 buckets a day, ~6 bytes each (min, max, sum, count)
  const hourGbPerDay = (10e6 * 24 * 6) / 1e9;
  const totalTb = (rawGbPerDay * 15 + minuteGbPerDay * 90 + hourGbPerDay * 730) / 1000;
  expect(minuteGbPerDay).toBeCloseTo(86.4, 1);
  expect(hourGbPerDay).toBeCloseTo(1.44, 2);
  expect(totalTb).toBeCloseTo(10.6, 1);
});
