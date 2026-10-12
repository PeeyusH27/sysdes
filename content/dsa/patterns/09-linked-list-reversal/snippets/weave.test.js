import { expect, test } from 'vitest';
import { fromArray, toArray } from './list.js';
import { fold, weave } from './weave.js';

test('weave alternates nodes and keeps leftovers', () => {
  expect(toArray(weave(fromArray([1, 2, 3]), fromArray([6, 5, 4])))).toEqual([1, 6, 2, 5, 3, 4]);
  expect(toArray(weave(fromArray([1, 2, 3]), fromArray([9])))).toEqual([1, 9, 2, 3]);
  expect(toArray(weave(fromArray([1]), fromArray([7, 8, 9])))).toEqual([1, 7, 8, 9]);
  expect(toArray(weave(fromArray([1, 2]), null))).toEqual([1, 2]);
});

test('fold takes from the front and the back in turn', () => {
  expect(toArray(fold(fromArray([1, 2, 3, 4, 5, 6])))).toEqual([1, 6, 2, 5, 3, 4]);
  expect(toArray(fold(fromArray([1, 2, 3, 4, 5])))).toEqual([1, 5, 2, 4, 3]);
  expect(toArray(fold(fromArray([1, 2])))).toEqual([1, 2]);
  expect(toArray(fold(fromArray([1])))).toEqual([1]);
  expect(fold(null)).toBe(null);
});
