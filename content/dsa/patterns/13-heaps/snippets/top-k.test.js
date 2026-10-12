import { expect, test } from 'vitest';
import { kLargest, kSmallestBy } from './top-k.js';

test('keeps the k largest values, largest first', () => {
  expect(kLargest([3, 1, 5, 12, 2, 11, 7], 3)).toEqual([12, 11, 7]);
  expect(kLargest([4, 4, 1, 4, 2], 2)).toEqual([4, 4]);
  expect(kLargest([-5, -1, -3], 1)).toEqual([-1]);
});

test('k equal to the length returns everything sorted', () => {
  expect(kLargest([2, 9, 4], 3)).toEqual([9, 4, 2]);
  expect(kLargest([], 2)).toEqual([]);
});

test('k smallest by a key', () => {
  const dist = ([x, y]) => x * x + y * y;
  expect(kSmallestBy([[3, 3], [1, -2], [-4, 0], [0, 1]], 2, dist)).toEqual([[0, 1], [1, -2]]);
  expect(kSmallestBy(['pear', 'fig', 'banana', 'kiwi'], 1, (s) => s.length)).toEqual(['fig']);
});
