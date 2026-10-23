import { test, expect } from 'vitest';
import { overhead } from './switch-cost.js';

test('a long slice hides the switch: 4 ms slice, 5 us switch is about 0.1%', () => {
  expect(overhead(4000, 5)).toBeCloseTo(0.00125, 5);
});

test('a tiny slice is mostly switching: 50 us slice, 5 us switch is about 9%', () => {
  expect(overhead(50, 5)).toBeCloseTo(5 / 55, 5);
});

test('cache refill can dominate: 1 ms slice, 5 us switch, 50 us refill is about 5%', () => {
  expect(overhead(1000, 5, 50)).toBeCloseTo(55 / 1055, 5);
  expect(overhead(1000, 5, 50)).toBeGreaterThan(overhead(1000, 5) * 10);
});
