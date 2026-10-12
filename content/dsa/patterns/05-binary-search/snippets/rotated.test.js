import { expect, test } from 'vitest';
import { findMinIndex } from './rotated.js';

test('finds the rotation point for every rotation', () => {
  const sorted = [2, 5, 8, 11, 14, 17, 20];
  for (let k = 0; k < sorted.length; k++) {
    const rotated = [...sorted.slice(k), ...sorted.slice(0, k)];
    expect(findMinIndex(rotated)).toBe((sorted.length - k) % sorted.length);
  }
});

test('handles one and two elements', () => {
  expect(findMinIndex([7])).toBe(0);
  expect(findMinIndex([4, 1])).toBe(1);
  expect(findMinIndex([1, 4])).toBe(0);
});
