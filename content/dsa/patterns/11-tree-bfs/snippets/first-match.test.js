import { expect, test } from 'vitest';
import { isLeaf, shallowestDepth } from './first-match.js';
import { fromArray } from './tree.js';

test('the first leaf BFS meets is the shallowest leaf', () => {
  expect(shallowestDepth(fromArray([1, 2, 3, 4, 5, null, null, 6, 7]), isLeaf)).toBe(2);
  expect(shallowestDepth(fromArray([1, null, 2, null, 3]), isLeaf)).toBe(3);
  expect(shallowestDepth(fromArray([1]), isLeaf)).toBe(1);
});

test('any predicate works, and no match gives -1', () => {
  const root = fromArray([5, 8, 2, 1, 9, 9]);
  expect(shallowestDepth(root, (n) => n.val === 9)).toBe(3);
  expect(shallowestDepth(root, (n) => n.val > 100)).toBe(-1);
  expect(shallowestDepth(null, isLeaf)).toBe(-1);
});
