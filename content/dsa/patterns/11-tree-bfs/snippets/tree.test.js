import { expect, test } from 'vitest';
import { fromArray } from './tree.js';

test('builds a tree from level order with nulls', () => {
  const root = fromArray([8, 3, 10, null, 6, null, 14]);
  expect(root.val).toBe(8);
  expect(root.left.left).toBeNull();
  expect(root.left.right.val).toBe(6);
  expect(root.right.right.val).toBe(14);
});

test('empty input gives null', () => {
  expect(fromArray([])).toBeNull();
  expect(fromArray([null])).toBeNull();
});
