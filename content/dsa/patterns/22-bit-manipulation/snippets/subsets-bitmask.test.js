import { expect, test } from 'vitest';
import { submasks, subsets } from './subsets-bitmask.js';

test('lists all 2^n subsets in mask order', () => {
  expect(subsets(['a', 'b', 'c'])).toEqual([[], ['a'], ['b'], ['a', 'b'], ['c'], ['a', 'c'], ['b', 'c'], ['a', 'b', 'c']]);
  expect(subsets([])).toEqual([[]]);
  expect(subsets([1, 2, 3, 4, 5]).length).toBe(32);
});

test('enumerates the submasks of a mask', () => {
  expect(submasks(0b1011)).toEqual([0b1011, 0b1010, 0b1001, 0b1000, 0b0011, 0b0010, 0b0001, 0]);
  expect(submasks(0)).toEqual([0]);
});
