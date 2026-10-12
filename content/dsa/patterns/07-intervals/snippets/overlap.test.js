import { expect, test } from 'vitest';
import { clashes, intersect, overlaps } from './overlap.js';

test('closed intervals overlap when they share a point', () => {
  expect(overlaps([1, 3], [2, 5])).toBe(true);
  expect(overlaps([1, 3], [3, 5])).toBe(true);
  expect(overlaps([1, 10], [4, 6])).toBe(true);
  expect(overlaps([1, 2], [3, 4])).toBe(false);
  expect(overlaps([5, 6], [1, 2])).toBe(false);
});

test('half-open meetings may be back to back', () => {
  expect(clashes([1, 3], [3, 5])).toBe(false);
  expect(clashes([1, 4], [3, 5])).toBe(true);
  expect(clashes([2, 3], [1, 9])).toBe(true);
});

test('intersection is the later start to the earlier end', () => {
  expect(intersect([0, 3], [2, 7])).toEqual([2, 3]);
  expect(intersect([1, 5], [5, 10])).toEqual([5, 5]);
  expect(intersect([1, 2], [4, 6])).toBeNull();
});
