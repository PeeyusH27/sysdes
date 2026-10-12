import { expect, test } from 'vitest';
import { minCostTable } from './stairs-table.js';
import { minCostRecursive } from './stairs-recursive.js';

test('bottom-up table matches the known answers', () => {
  expect(minCostTable([1, 4, 2, 3, 1, 5, 2])).toBe(6);
  expect(minCostTable([1, 100, 1, 1, 1, 100, 1, 1, 100, 1])).toBe(6);
  expect(minCostTable([10, 15])).toBe(10);
  expect(minCostTable([5])).toBe(0);
});

test('bottom-up table agrees with plain recursion on small inputs', () => {
  for (let n = 1; n <= 14; n++) {
    const cost = Array.from({ length: n }, (_, i) => (i * 37 + n * 11) % 9);
    expect(minCostTable(cost)).toBe(minCostRecursive(cost));
  }
});
