import { expect, test } from 'vitest';
import { coveredLength, mergeIntervals } from './merge.js';

test('merges overlapping, touching and nested intervals', () => {
  expect(mergeIntervals([[7, 8], [2, 4], [10, 11], [1, 3], [4, 5]])).toEqual([[1, 5], [7, 8], [10, 11]]);
  expect(mergeIntervals([[4, 8], [1, 10], [10, 11], [2, 3]])).toEqual([[1, 11]]);
  expect(mergeIntervals([[1, 2], [3, 4]])).toEqual([[1, 2], [3, 4]]);
  expect(mergeIntervals([])).toEqual([]);
});

test('does not reorder the caller\'s array', () => {
  const input = [[5, 6], [1, 2]];
  mergeIntervals(input);
  expect(input).toEqual([[5, 6], [1, 2]]);
});

test('covered length counts shared parts once', () => {
  expect(coveredLength([[1, 4], [2, 6], [8, 9]])).toBe(6);
  expect(coveredLength([[0, 10], [2, 3]])).toBe(10);
  expect(coveredLength([])).toBe(0);
});
