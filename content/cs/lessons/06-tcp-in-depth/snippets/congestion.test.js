import { test, expect } from 'vitest';
import { cwndSeries, throughputMbps } from './congestion.js';

test('slow start doubles every round trip, then congestion avoidance adds one', () => {
  expect(cwndSeries({ rounds: 8, initial: 1, ssthresh: 8 })).toEqual([1, 2, 4, 8, 9, 10, 11, 12]);
});

test('with the modern initial window of 10, the pipe fills in three round trips', () => {
  expect(cwndSeries({ rounds: 5, initial: 10, ssthresh: 64 })).toEqual([10, 20, 40, 64, 65]);
});

test('three duplicate ACKs halve the window and growth resumes linearly', () => {
  const s = cwndSeries({ rounds: 9, initial: 1, ssthresh: 64, loss: { round: 5, kind: 'dupack' } });
  expect(s).toEqual([1, 2, 4, 8, 16, 32, 16, 17, 18]);
});

test('a timeout is much worse: back to 1 and slow start again', () => {
  const s = cwndSeries({ rounds: 12, initial: 1, ssthresh: 64, loss: { round: 5, kind: 'timeout' } });
  expect(s).toEqual([1, 2, 4, 8, 16, 32, 1, 2, 4, 8, 16, 17]);
  const dup = cwndSeries({ rounds: 12, initial: 1, ssthresh: 64, loss: { round: 5, kind: 'dupack' } });
  expect(s.reduce((a, b) => a + b)).toBeLessThan(dup.reduce((a, b) => a + b));
});

test('throughput is about window x segment size / round trip: 64 segments at 50 ms is about 15 Mbit/s', () => {
  expect(throughputMbps(64)).toBeCloseTo(14.95, 1);
});
