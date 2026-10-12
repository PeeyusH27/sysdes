import { expect, test } from 'vitest';
import { maxMinDistance, shipWithinDays } from './answer-space.js';

test('smallest capacity that ships within the deadline', () => {
  expect(shipWithinDays([4, 2, 3, 1, 2], 3)).toBe(5);
  expect(shipWithinDays([4, 2, 3, 1, 2], 1)).toBe(12);
  expect(shipWithinDays([4, 2, 3, 1, 2], 5)).toBe(4);
  expect(shipWithinDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)).toBe(15);
});

test('largest minimum gap between k placed items', () => {
  expect(maxMinDistance([1, 2, 4, 8, 9], 3)).toBe(3);
  expect(maxMinDistance([9, 1, 8, 4, 2], 3)).toBe(3);
  expect(maxMinDistance([1, 2, 3, 4], 4)).toBe(1);
  expect(maxMinDistance([0, 100], 2)).toBe(100);
});
