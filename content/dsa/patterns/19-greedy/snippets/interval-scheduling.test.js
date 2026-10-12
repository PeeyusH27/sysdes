import { expect, test } from 'vitest';
import { maxNonOverlapping } from './interval-scheduling.js';

test('keeps the most activities', () => {
  expect(maxNonOverlapping([[5, 9], [1, 3], [6, 8], [2, 5], [8, 10], [4, 6]])).toBe(4);
  expect(maxNonOverlapping([[1, 100], [2, 3], [4, 5], [6, 7]])).toBe(3);
  expect(maxNonOverlapping([[1, 5], [4, 7], [6, 10]])).toBe(2);
});

test('touching is fine; identical intervals keep one', () => {
  expect(maxNonOverlapping([[1, 2], [2, 3], [3, 4]])).toBe(3);
  expect(maxNonOverlapping([[4, 6], [4, 6], [4, 6]])).toBe(1);
  expect(maxNonOverlapping([])).toBe(0);
});
