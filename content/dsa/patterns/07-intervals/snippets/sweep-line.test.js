import { expect, test } from 'vitest';
import { maxOverlap } from './sweep-line.js';

test('counts the most intervals open at once', () => {
  expect(maxOverlap([[1, 5], [2, 6], [4, 8], [6, 9], [8, 10]])).toBe(3);
  expect(maxOverlap([[1, 10], [2, 9], [3, 8]])).toBe(3);
  expect(maxOverlap([])).toBe(0);
});

test('back-to-back intervals do not overlap', () => {
  expect(maxOverlap([[1, 3], [3, 5], [5, 7]])).toBe(1);
  expect(maxOverlap([[3, 5], [1, 3]])).toBe(1);
});
