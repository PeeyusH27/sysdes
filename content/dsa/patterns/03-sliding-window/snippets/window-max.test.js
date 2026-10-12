import { expect, test } from 'vitest';
import { windowMax } from './window-max.js';

test('maximum of every window of size k', () => {
  expect(windowMax([5, 3, 4, 1, 6, 2, 2], 3)).toEqual([5, 4, 6, 6, 6]);
  expect(windowMax([9, 7, 5, 3, 1], 3)).toEqual([9, 7, 5]);
  expect(windowMax([1, 2, 3, 4], 2)).toEqual([2, 3, 4]);
});

test('k = 1 and k = n', () => {
  expect(windowMax([4, -1, 2], 1)).toEqual([4, -1, 2]);
  expect(windowMax([4, -1, 2], 3)).toEqual([4]);
  expect(windowMax([], 2)).toEqual([]);
});
