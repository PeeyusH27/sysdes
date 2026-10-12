import { expect, test } from 'vitest';
import { fromArray, toArray } from './list.js';
import { endOfFirstHalf, middleNode } from './middle.js';

test('middleNode returns the middle, or the second middle on even lengths', () => {
  expect(toArray(middleNode(fromArray([1, 2, 3, 4, 5])))).toEqual([3, 4, 5]);
  expect(toArray(middleNode(fromArray([1, 2, 3, 4, 5, 6])))).toEqual([4, 5, 6]);
  expect(toArray(middleNode(fromArray([7])))).toEqual([7]);
  expect(toArray(middleNode(fromArray([1, 2])))).toEqual([2]);
  expect(middleNode(null)).toBe(null);
});

test('endOfFirstHalf stops on the first middle', () => {
  expect(endOfFirstHalf(fromArray([1, 2, 3, 4, 5])).val).toBe(3);
  expect(endOfFirstHalf(fromArray([1, 2, 3, 4, 5, 6])).val).toBe(3);
  expect(endOfFirstHalf(fromArray([1, 2])).val).toBe(1);
  expect(endOfFirstHalf(fromArray([9])).val).toBe(9);
});
