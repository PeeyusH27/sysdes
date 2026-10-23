import { test, expect } from 'vitest';
import { speedup, limit } from './amdahl.js';

test('8 workers on 90% parallel work give about 4.7x, not 8x', () => {
  expect(speedup(0.9, 8)).toBeCloseTo(4.706, 3);
});

test('no matter how many workers, 90% parallel work tops out at 10x', () => {
  expect(limit(0.9)).toBeCloseTo(10, 5);
  expect(speedup(0.9, 1_000_000)).toBeLessThan(10);
});

test('the edges: fully serial work never speeds up, fully parallel work scales linearly', () => {
  expect(speedup(0, 64)).toBe(1);
  expect(speedup(1, 8)).toBe(8);
});
