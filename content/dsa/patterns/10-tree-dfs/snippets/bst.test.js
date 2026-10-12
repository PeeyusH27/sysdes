import { expect, test } from 'vitest';
import { rangeSum, searchBST } from './bst.js';
import { fromArray } from './tree.js';

const bst = () => fromArray([8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13]);

test('rangeSum adds only values inside [low, high]', () => {
  expect(rangeSum(bst(), 4, 10)).toBe(4 + 6 + 7 + 8 + 10);
  expect(rangeSum(bst(), 15, 20)).toBe(0);
  expect(rangeSum(null, 0, 5)).toBe(0);
});

test('searchBST follows one branch', () => {
  expect(searchBST(bst(), 7).val).toBe(7);
  expect(searchBST(bst(), 13).val).toBe(13);
  expect(searchBST(bst(), 5)).toBeNull();
});
