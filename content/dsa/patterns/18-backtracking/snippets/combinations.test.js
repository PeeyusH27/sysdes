import { expect, test } from 'vitest';
import { combinations } from './combinations.js';

test('lists every k-combination once, in increasing order', () => {
  expect(combinations(4, 2)).toEqual([[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]);
  expect(combinations(3, 3)).toEqual([[1, 2, 3]]);
  expect(combinations(3, 1)).toEqual([[1], [2], [3]]);
});

test('counts match n choose k', () => {
  const choose = (n, k) => (k === 0 ? 1 : (choose(n - 1, k - 1) * n) / k);
  for (const [n, k] of [[5, 2], [6, 3], [8, 4], [7, 0]]) expect(combinations(n, k)).toHaveLength(choose(n, k));
});
