import { expect, test } from 'vitest';
import { bloomSize, falsePositiveRate } from './bloom-size.js';

test('1M ids at 1% need about 1.2 MB and 7 hashes', () => {
  const s = bloomSize(1_000_000, 0.01);
  expect(s.hashes).toBe(7);
  expect(s.bytes / 1e6).toBeCloseTo(1.2, 1);
});

test('100K ids at 1% need about 120 KB', () => {
  const s = bloomSize(100_000, 0.01);
  expect(s.bits).toBe(958_506);
  expect(s.bytes).toBe(119_814);
  expect(s.hashes).toBe(7);
});

test('100K ids at 0.1% need about 14.4 bits per id and 10 hashes', () => {
  const s = bloomSize(100_000, 0.001);
  expect(s.bits / 100_000).toBeCloseTo(14.38, 1);
  expect(s.hashes).toBe(10);
});

test('1M bits with 7 hashes and 100K ids gives about 0.65%', () => {
  expect(falsePositiveRate(1 << 20, 7, 100_000)).toBeCloseTo(0.0065, 3);
});

test('sizing for p gives back about p', () => {
  const { bits, hashes } = bloomSize(50_000, 0.02);
  expect(falsePositiveRate(bits, hashes, 50_000)).toBeCloseTo(0.02, 2);
});
