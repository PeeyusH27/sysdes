import { expect, test } from 'vitest';
import { cycleStart, hasCycle } from './cycle.js';
import { fromArray } from './list.js';

test('detects cycles of every shape', () => {
  expect(hasCycle(fromArray([3, 8, 5, 1, 9, 4, 7], 2))).toBe(true);
  expect(hasCycle(fromArray([1], 0))).toBe(true);
  expect(hasCycle(fromArray([1, 2, 3, 4], 0))).toBe(true);
  expect(hasCycle(fromArray([1, 2, 3, 4]))).toBe(false);
  expect(hasCycle(fromArray([5, 5, 5]))).toBe(false);
  expect(hasCycle(null)).toBe(false);
});

test('finds the node where the cycle starts', () => {
  for (const [values, pos] of [[[3, 8, 5, 1, 9, 4, 7], 2], [[1, 2], 0], [[1, 2, 3, 4, 5, 6], 5], [[1], 0], [[10, 20, 30, 40, 50, 60, 70, 80, 90], 1]]) {
    expect(cycleStart(fromArray(values, pos)).val).toBe(values[pos]);
  }
  expect(cycleStart(fromArray([1, 2, 3]))).toBe(null);
  expect(cycleStart(null)).toBe(null);
});
