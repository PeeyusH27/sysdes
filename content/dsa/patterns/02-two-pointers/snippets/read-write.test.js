import { expect, test } from 'vitest';
import { removeDuplicates } from './read-write.js';

test('compacts a sorted array in place', () => {
  const nums = [1, 1, 2, 3, 3, 3, 4];
  const k = removeDuplicates(nums);
  expect(k).toBe(4);
  expect(nums.slice(0, k)).toEqual([1, 2, 3, 4]);
});

test('handles empty and all-equal input', () => {
  expect(removeDuplicates([])).toBe(0);
  const same = [7, 7, 7];
  expect(removeDuplicates(same)).toBe(1);
  expect(same[0]).toBe(7);
});
