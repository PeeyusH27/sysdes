import { expect, test } from 'vitest';
import { traversals } from './orders.js';
import { fromArray } from './tree.js';

test('pre-, in- and post-order of a small BST', () => {
  const { pre, inorder, post } = traversals(fromArray([8, 3, 10, 1, 6, null, 14]));
  expect(pre).toEqual([8, 3, 1, 6, 10, 14]);
  expect(inorder).toEqual([1, 3, 6, 8, 10, 14]);
  expect(post).toEqual([1, 6, 3, 14, 10, 8]);
});

test('empty tree and single node', () => {
  expect(traversals(null)).toEqual({ pre: [], inorder: [], post: [] });
  expect(traversals(fromArray([5]))).toEqual({ pre: [5], inorder: [5], post: [5] });
});
