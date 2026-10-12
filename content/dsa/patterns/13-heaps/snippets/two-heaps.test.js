import { expect, test } from 'vitest';
import { runningMedians } from './two-heaps.js';

const bruteMedians = (nums) =>
  nums.map((_, i) => {
    const s = nums.slice(0, i + 1).sort((a, b) => a - b);
    const n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  });

test('median after every number', () => {
  expect(runningMedians([6, 2, 9, 1])).toEqual([6, 4, 6, 4]);
  expect(runningMedians([1, 2, 3])).toEqual([1, 1.5, 2]);
  expect(runningMedians([])).toEqual([]);
});

test('matches re-sorting on mixed input', () => {
  const nums = [5, -3, 5, 12, 0, 0, -7, 8, 8, 1, 4, -2];
  expect(runningMedians(nums)).toEqual(bruteMedians(nums));
});
