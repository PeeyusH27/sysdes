import { expect, test } from 'vitest';
import { backoffDelay } from './backoff.js';

const almostOne = () => 0.999999;

test('the upper bound doubles each attempt', () => {
  expect(backoffDelay(0, { random: almostOne })).toBeCloseTo(1_000, 0);
  expect(backoffDelay(1, { random: almostOne })).toBeCloseTo(2_000, 0);
  expect(backoffDelay(3, { random: almostOne })).toBeCloseTo(8_000, 0);
  expect(backoffDelay(2, { baseMs: 500, random: almostOne })).toBeCloseTo(2_000, 0);
});

test('never exceeds the cap, even after many failures', () => {
  for (const attempt of [5, 10, 50, 1_000]) {
    expect(backoffDelay(attempt, { random: almostOne })).toBeLessThanOrEqual(30_000);
  }
});

test('full jitter: any delay between 0 and the bound', () => {
  expect(backoffDelay(4, { random: () => 0 })).toBe(0);
  expect(backoffDelay(4, { random: () => 0.5 })).toBe(8_000);   // half of min(30 s, 16 s)
  for (let i = 0; i < 1_000; i++) {
    const d = backoffDelay(2);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThan(4_000);
  }
});
