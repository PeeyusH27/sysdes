import { expect, test } from 'vitest';
import { mergeSorted, removeAll } from './dummy-head.js';
import { fromArray, toArray } from './list.js';

test('removeAll handles the head, runs and the tail', () => {
  expect(toArray(removeAll(fromArray([6, 1, 6, 6, 2, 6]), 6))).toEqual([1, 2]);
  expect(toArray(removeAll(fromArray([6, 6]), 6))).toEqual([]);
  expect(toArray(removeAll(fromArray([1, 2, 3]), 9))).toEqual([1, 2, 3]);
  expect(removeAll(null, 1)).toBe(null);
});

test('mergeSorted splices two sorted lists', () => {
  expect(toArray(mergeSorted(fromArray([1, 4, 9]), fromArray([2, 3, 10])))).toEqual([1, 2, 3, 4, 9, 10]);
  expect(toArray(mergeSorted(null, fromArray([0])))).toEqual([0]);
  expect(mergeSorted(null, null)).toBe(null);
});
