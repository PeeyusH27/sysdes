import { test, expect } from 'vitest';
import { addHistograms, average, histogram, merge, quantile, rollup } from './rollup.js';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;

// A CPU series: one point every 10 s for 2 hours, with one short spike.
const points = Array.from({ length: 720 }, (_, i) => ({ t: i * 10 * SEC, v: 20 + (i % 6) + (i === 100 ? 70 : 0) }));

test('1 minute rollups have 6 samples each, and keep the spike that an average would hide', () => {
  const minutes = rollup(points, MIN);
  expect(minutes).toHaveLength(120);
  expect(minutes[0].count).toBe(6);
  const spikeMinute = minutes.find((b) => b.start === Math.floor((100 * 10 * SEC) / MIN) * MIN);
  expect(spikeMinute.max).toBe(20 + (100 % 6) + 70);
  expect(average(spikeMinute)).toBeLessThan(spikeMinute.max - 10);   // the average alone would underplay it
});

test('rolling minutes up to hours gives the same answer as rolling the raw points up to hours', () => {
  const direct = rollup(points, HOUR);
  const viaMinutes = merge(rollup(points, MIN), HOUR);
  expect(viaMinutes).toEqual(direct);
  expect(direct).toHaveLength(2);
  expect(direct[0].count).toBe(360);
});

test('averaging two p99 values is wrong; adding histograms is right', () => {
  const bounds = [10, 50, 100, 500, 1000];
  // Service A: 990 fast requests and 10 slow ones. Service B: 100 requests, all around 40 ms.
  const a = [...Array(990).fill(5), ...Array(10).fill(900)];
  const b = Array(100).fill(40);
  const p99a = quantile(histogram(a, bounds), bounds, 0.99);
  const p99b = quantile(histogram(b, bounds), bounds, 0.99);
  const wrong = (p99a + p99b) / 2;
  const right = quantile(addHistograms(histogram(a, bounds), histogram(b, bounds)), bounds, 0.99);
  expect(p99a).toBe(10);
  expect(p99b).toBe(50);
  expect(wrong).toBe(30);
  expect(right).toBe(50);                                 // 1,100 requests: the 99th percentile is in the 10-50 ms bucket
  expect(right).not.toBe(wrong);
});

test('quantile returns the bucket bound holding the requested rank', () => {
  const bounds = [10, 100, 1000];
  const counts = histogram([1, 2, 3, 50, 60, 70, 80, 500, 600, 5000], bounds);
  expect(counts).toEqual([3, 4, 2, 1]);
  expect(quantile(counts, bounds, 0.5)).toBe(100);
  expect(quantile(counts, bounds, 0.99)).toBe(Infinity);
});
