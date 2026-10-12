import { expect, test } from 'vitest';
import { inorderIterative, postorderIterative, preorderIterative } from './iterative.js';
import { traversals } from './orders.js';
import { fromArray } from './tree.js';

const shapes = [[8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13], [1, 2, null, 3, null, 4], [1, null, 2, null, 3], [5], []];

test('iterative orders match the recursive ones', () => {
  for (const shape of shapes) {
    const expected = traversals(fromArray(shape));
    expect(preorderIterative(fromArray(shape))).toEqual(expected.pre);
    expect(inorderIterative(fromArray(shape))).toEqual(expected.inorder);
    expect(postorderIterative(fromArray(shape))).toEqual(expected.post);
  }
});

test('in-order of a BST is sorted', () => {
  expect(inorderIterative(fromArray([6, 3, 9, 1, 4, 8, 10]))).toEqual([1, 3, 4, 6, 8, 9, 10]);
});
